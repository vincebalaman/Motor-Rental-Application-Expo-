begin;
-- Legacy bookings deliberately retain NULL agreed times and a zero late-fee rate.
alter table public.bookings
 add column scheduled_pickup_at timestamptz,
 add column scheduled_return_at timestamptz,
 add column late_hour_rate_centavos bigint not null default 0,
 add column late_hours integer not null default 0,
 add column late_fee_centavos bigint generated always as (late_hours::bigint * late_hour_rate_centavos) stored,
 add column final_total_centavos bigint generated always as
   (daily_rate_centavos * (return_date - pickup_date) + late_hours::bigint * late_hour_rate_centavos) stored;
create function private.completed_late_hours(p_due timestamptz,p_returned timestamptz)
returns integer language sql immutable set search_path='' as $$
 select case when p_due is null or p_returned is null then 0
 else floor(greatest(extract(epoch from (p_returned-p_due)),0)/3600)::integer end;
$$;
revoke all on function private.completed_late_hours(timestamptz,timestamptz) from public,anon,authenticated;
alter table public.bookings add constraint bookings_agreed_times check (
 (scheduled_pickup_at is null and scheduled_return_at is null and late_hour_rate_centavos=0)
 or (scheduled_pickup_at is not null and scheduled_return_at is not null
   and isfinite(scheduled_pickup_at) and isfinite(scheduled_return_at)
   and scheduled_return_at = scheduled_pickup_at + (return_date-pickup_date)*interval '24 hours'
   and pickup_date=(scheduled_pickup_at at time zone 'Asia/Manila')::date
   and return_date=(scheduled_return_at at time zone 'Asia/Manila')::date
   and late_hour_rate_centavos=20000)
);
alter table public.bookings add constraint bookings_late_hours check (
 late_hours >= 0 and late_hours = case when status='completed'
 then private.completed_late_hours(scheduled_return_at,returned_at) else 0 end
);
drop index public.bookings_active_request;
create unique index bookings_active_request on public.bookings(client_id,motor_id,pickup_date,return_date)
 where scheduled_pickup_at is null and status in ('pending','approved','in_use');
create unique index bookings_active_timed_request on public.bookings(client_id,motor_id,scheduled_pickup_at,scheduled_return_at)
 where scheduled_pickup_at is not null and status in ('pending','approved','in_use');
create index bookings_motor_times on public.bookings(motor_id,scheduled_pickup_at,scheduled_return_at)
 where status in ('approved','in_use');
create function private.booking_time_conflicts(p_motor_id uuid,p_pickup timestamptz,p_return timestamptz,p_exclude uuid default null)
returns boolean language sql volatile security definer set search_path='' as $$
 select exists(select 1 from public.bookings b
 where b.motor_id=p_motor_id and (p_exclude is null or b.id<>p_exclude) and b.status in ('approved','in_use')
 and ((coalesce(b.scheduled_pickup_at,b.pickup_date::timestamp at time zone 'Asia/Manila') < p_return
 and coalesce(b.scheduled_return_at,b.return_date::timestamp at time zone 'Asia/Manila') > p_pickup)
 or (b.status='in_use' and coalesce(b.scheduled_return_at,b.return_date::timestamp at time zone 'Asia/Manila')<=clock_timestamp())));
$$;
revoke all on function private.booking_time_conflicts(uuid,timestamptz,timestamptz,uuid) from public,anon,authenticated;
create or replace function private.booking_conflicts(p_motor_id uuid,p_pickup date,p_return date,p_exclude uuid default null)
returns boolean language sql volatile security definer set search_path='' as $$
 select private.booking_time_conflicts(p_motor_id,p_pickup::timestamp at time zone 'Asia/Manila',p_return::timestamp at time zone 'Asia/Manila',p_exclude);
$$;
-- Disable new date-only requests so an older client cannot omit the agreed schedule/rate.
create or replace function public.request_motor_booking(p_motor_id uuid,p_pickup_date date,p_return_date date,p_expected_rate bigint)
returns public.bookings language plpgsql security definer set search_path='' as $$
begin raise exception 'booking_time_required'; end;
$$;
create function public.request_timed_motor_booking(p_motor_id uuid,p_pickup_at timestamptz,p_rental_days integer,p_expected_rate bigint)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); motor public.motors; result public.bookings; due timestamptz; event_time timestamptz;
begin
 if actor is null or not exists(select 1 from public.user_roles where user_id=actor and role='client') then
 raise exception using errcode='42501',message='booking_client_required'; end if;
 select * into motor from public.motors where id=p_motor_id for update;
 if not found then raise exception 'booking_motor_unavailable'; end if;
 if p_pickup_at is null or not isfinite(p_pickup_at) or p_rental_days is null or p_rental_days not between 1 and 90
 or date_trunc('minute',p_pickup_at)<>p_pickup_at then raise exception 'booking_invalid_times'; end if;
 due:=p_pickup_at + p_rental_days*interval '24 hours';
 select * into result from public.bookings where client_id=actor and motor_id=p_motor_id
 and scheduled_pickup_at=p_pickup_at and scheduled_return_at=due and status in ('pending','approved','in_use');
 if found then return result; end if;
 event_time:=clock_timestamp();
 if p_pickup_at<=event_time or (p_pickup_at at time zone 'Asia/Manila')::date>(event_time at time zone 'Asia/Manila')::date+365 then
 raise exception 'booking_invalid_times'; end if;
 if motor.archived_at is not null or motor.operating_status<>'available' then raise exception 'booking_motor_unavailable'; end if;
 if p_expected_rate is distinct from motor.daily_rate_centavos then raise exception 'booking_rate_changed'; end if;
 if private.booking_time_conflicts(motor.id,p_pickup_at,due) then raise exception 'booking_dates_unavailable'; end if;
 insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
 values(actor,motor.id,motor.name,(p_pickup_at at time zone 'Asia/Manila')::date,(due at time zone 'Asia/Manila')::date,motor.daily_rate_centavos,p_pickup_at,due,20000)
 returning * into result;
 return result;
end;
$$;
revoke all on function public.request_timed_motor_booking(uuid,timestamptz,integer,bigint) from public,anon,authenticated;
grant execute on function public.request_timed_motor_booking(uuid,timestamptz,integer,bigint) to authenticated;
-- Privacy-preserving merged intervals, covering the whole allowed pickup + rental horizon.
create function public.motor_booked_periods(p_motor_id uuid)
returns table(blocked_start timestamptz,blocked_end timestamptz)
language plpgsql stable security definer set search_path='' as $$
declare horizon timestamptz:=(((now() at time zone 'Asia/Manila')::date+456)::timestamp at time zone 'Asia/Manila');
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid()) then
 raise exception using errcode='42501',message='booking_client_required'; end if;
 if not exists(select 1 from public.motors where id=p_motor_id and archived_at is null and operating_status='available') then
 raise exception 'booking_motor_unavailable'; end if;
 return query with periods as (
 select case when b.status='in_use' and coalesce(b.scheduled_return_at,b.return_date::timestamp at time zone 'Asia/Manila')<=now()
 then tstzrange(now(),horizon,'[)')
 else tstzrange(coalesce(b.scheduled_pickup_at,b.pickup_date::timestamp at time zone 'Asia/Manila'),coalesce(b.scheduled_return_at,b.return_date::timestamp at time zone 'Asia/Manila'),'[)')
 * tstzrange(now(),horizon,'[)') end as period
 from public.bookings b where b.motor_id=p_motor_id and b.status in ('approved','in_use')
 ), merged as (select range_agg(period) as periods from periods where not isempty(period))
 select lower(r),upper(r) from merged cross join lateral unnest(periods) r order by 1;
end;
$$;
revoke all on function public.motor_booked_periods(uuid) from public,anon,authenticated;
grant execute on function public.motor_booked_periods(uuid) to authenticated;
create or replace function public.motor_blocked_dates(p_motor_id uuid)
returns table(blocked_date date)
language sql stable security definer set search_path='' as $$
 select ((now() at time zone 'Asia/Manila')::date+i)::date
 from generate_series(0,455) days(i)
 where exists(select 1 from public.motor_booked_periods(p_motor_id) p
 where p.blocked_start < (((now() at time zone 'Asia/Manila')::date+i+1)::timestamp at time zone 'Asia/Manila')
 and p.blocked_end > (((now() at time zone 'Asia/Manila')::date+i)::timestamp at time zone 'Asia/Manila')) order by 1;
$$;
create or replace function public.review_motor_booking(p_booking_id uuid, p_approve boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare motor public.motors; result public.bookings; target_motor uuid;
begin
  if not private.is_admin() then raise exception using errcode = '42501', message = 'booking_admin_required'; end if;
  if p_approve is distinct from true then raise exception 'booking_rejection_reason_required'; end if;
  select motor_id into target_motor from public.bookings where id = p_booking_id;
  select * into motor from public.motors where id = target_motor for update;
  select * into result from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if p_approve is null or result.status <> 'pending' then raise exception 'booking_not_pending'; end if;
  if p_approve then
    if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
    if (result.scheduled_pickup_at is not null and result.scheduled_pickup_at<=clock_timestamp()) or (result.scheduled_pickup_at is null and result.pickup_date < (clock_timestamp() at time zone 'Asia/Manila')::date) then raise exception 'booking_invalid_dates'; end if;
    if private.booking_time_conflicts(result.motor_id,coalesce(result.scheduled_pickup_at,result.pickup_date::timestamp at time zone 'Asia/Manila'),coalesce(result.scheduled_return_at,result.return_date::timestamp at time zone 'Asia/Manila')) then raise exception 'booking_dates_unavailable'; end if;
  end if;
  update public.bookings set status = case when p_approve then 'approved' else 'rejected' end where id = result.id returning * into result;
  return result;
end;
$$;
create or replace function public.record_motor_handover(p_booking_id uuid, p_action text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare motor public.motors; result public.bookings; target_motor uuid;
  event_time timestamptz; today date;
begin
  if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
  if p_action is null or p_action not in ('pickup','return') then raise exception 'booking_invalid_action'; end if;
  select motor_id into target_motor from public.bookings where id=p_booking_id;
  select * into motor from public.motors where id=target_motor for update;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  event_time:=clock_timestamp(); today:=(event_time at time zone 'Asia/Manila')::date;
  if p_action = 'pickup' then
    if result.status = 'in_use' then return result; end if;
    if result.status <> 'approved' then raise exception 'booking_invalid_transition'; end if;
    if (result.scheduled_pickup_at is not null and (event_time<result.scheduled_pickup_at or event_time>=result.scheduled_return_at)) or (result.scheduled_pickup_at is null and (result.pickup_date>today or result.return_date<=today)) then raise exception 'booking_pickup_outside_dates'; end if;
    if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
    if exists(select 1 from public.bookings where motor_id=target_motor and status='in_use' and id<>result.id) then
      raise exception 'booking_motor_still_out';
    end if;
    if private.booking_time_conflicts(target_motor,coalesce(result.scheduled_pickup_at,result.pickup_date::timestamp at time zone 'Asia/Manila'),coalesce(result.scheduled_return_at,result.return_date::timestamp at time zone 'Asia/Manila'),result.id) then raise exception 'booking_dates_unavailable'; end if;
    update public.bookings set status='in_use',picked_up_at=event_time,picked_up_by=auth.uid()
      where id=result.id returning * into result;
  else
    if result.status = 'completed' then return result; end if;
    if result.status <> 'in_use' then raise exception 'booking_invalid_transition'; end if;
    update public.bookings set status='completed',returned_at=event_time,returned_by=auth.uid(),late_hours=private.completed_late_hours(result.scheduled_return_at,event_time)
      where id=result.id returning * into result;
  end if;
  return result;
end;
$$;
revoke all on function public.record_motor_handover(uuid,text) from public,anon,authenticated;
grant execute on function public.record_motor_handover(uuid,text) to authenticated;

create or replace function public.admin_mark_booking_no_show(p_booking_id uuid,p_reason text)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare result public.bookings; target_motor uuid;
 reason text := btrim(regexp_replace(p_reason,'[[:space:]]+',' ','g'));
begin
 if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
 if reason is null or char_length(reason) not between 5 and 500 then raise exception 'booking_no_show_reason_required'; end if;
 select motor_id into target_motor from public.bookings where id=p_booking_id;
 perform id from public.motors where id=target_motor for update;
 select * into result from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'booking_not_found'; end if;
 if result.status='no_show' then
   if result.no_show_reason=reason then return result; end if;
   raise exception 'booking_no_show_conflict';
 end if;
 if result.status<>'approved' or result.picked_up_at is not null then raise exception 'booking_no_show_not_eligible'; end if;
 if (result.scheduled_pickup_at is not null and result.scheduled_pickup_at>=clock_timestamp()) or (result.scheduled_pickup_at is null and result.pickup_date >= (clock_timestamp() at time zone 'Asia/Manila')::date) then raise exception 'booking_no_show_too_early'; end if;
 update public.bookings set status='no_show',no_show_at=clock_timestamp(),no_show_by=auth.uid(),no_show_reason=reason
  where id=result.id returning * into result;
 return result;
end;
$$;
revoke all on function public.admin_mark_booking_no_show(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_mark_booking_no_show(uuid,text) to authenticated;
create or replace function private.guard_reserved_motor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.archived_at is distinct from old.archived_at and new.archived_at is not null)
     or (new.operating_status is distinct from old.operating_status and new.operating_status <> 'available') then
    if exists(select 1 from public.bookings where motor_id=old.id
      and (status='in_use' or (status='approved' and coalesce(scheduled_return_at,return_date::timestamp at time zone 'Asia/Manila')>now()))) then
      raise exception 'motor_has_active_bookings';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reserved_motor() from public,anon,authenticated;

create or replace function public.admin_booking_summary()
returns table(today date,pending bigint,pickups_today bigint,returns_today bigint,in_use bigint,overdue bigint)
language plpgsql stable security definer set search_path = '' as $$
declare day date := (now() at time zone 'Asia/Manila')::date;
begin
  if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
  return query select day,
    count(*) filter (where b.status='pending'),
    count(*) filter (where b.status='approved' and b.pickup_date=day),
    count(*) filter (where b.status='in_use' and b.return_date=day),
    count(*) filter (where b.status='in_use'),
    count(*) filter (where b.status='in_use' and coalesce(b.scheduled_return_at,b.return_date::timestamp at time zone 'Asia/Manila')<=now())
  from public.bookings b;
end;
$$;
revoke all on function public.admin_booking_summary() from public,anon,authenticated;
grant execute on function public.admin_booking_summary() to authenticated;

commit;

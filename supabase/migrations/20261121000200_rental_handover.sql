begin;
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending','approved','in_use','completed','rejected','cancelled'));
alter table public.bookings
  add column picked_up_at timestamptz,
  add column returned_at timestamptz,
  add column picked_up_by uuid references auth.users(id) on delete set null,
  add column returned_by uuid references auth.users(id) on delete set null;
alter table public.bookings add constraint bookings_lifecycle_times check (
  (status = 'in_use' and picked_up_at is not null and returned_at is null)
  or (status = 'completed' and picked_up_at is not null and returned_at is not null and returned_at >= picked_up_at)
  or (status not in ('in_use','completed') and picked_up_at is null and returned_at is null)
);
drop index public.bookings_active_request;
create unique index bookings_active_request on public.bookings(client_id,motor_id,pickup_date,return_date)
where status in ('pending','approved','in_use');
drop index public.bookings_motor_dates;
create index bookings_motor_dates on public.bookings(motor_id,pickup_date,return_date) where status in ('approved','in_use');
create unique index bookings_one_motor_in_use on public.bookings(motor_id) where status = 'in_use';

create function private.booking_conflicts(p_motor_id uuid, p_pickup date, p_return date, p_exclude uuid default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.bookings b
    where b.motor_id = p_motor_id and (p_exclude is null or b.id <> p_exclude)
    and b.status in ('approved','in_use') and (
      (b.pickup_date < p_return and b.return_date > p_pickup)
      or (b.status = 'in_use' and b.return_date <= (now() at time zone 'Asia/Manila')::date)
    ));
$$;
revoke all on function private.booking_conflicts(uuid,date,date,uuid) from public,anon,authenticated;

create or replace function public.request_motor_booking(p_motor_id uuid, p_pickup_date date, p_return_date date, p_expected_rate bigint)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  today date := (now() at time zone 'Asia/Manila')::date;
  motor public.motors;
  result public.bookings;
begin
  if actor is null or not exists(select 1 from public.user_roles where user_id = actor and role = 'client') then
    raise exception using errcode = '42501', message = 'booking_client_required';
  end if;
  -- Serialize requests and future approvals per motor; also blocks concurrent catalog edits.
  select * into motor from public.motors where id = p_motor_id for update;
  if not found then raise exception 'booking_motor_unavailable'; end if;
  -- A retry after an uncertain response returns the original active request.
  select * into result from public.bookings where client_id = actor and motor_id = p_motor_id
    and pickup_date = p_pickup_date and return_date = p_return_date and status in ('pending','approved','in_use');
  if found then return result; end if;
  if p_pickup_date is null or p_return_date is null or p_pickup_date < today or p_pickup_date > today + 365
     or p_return_date <= p_pickup_date or p_return_date - p_pickup_date > 90 then
    raise exception 'booking_invalid_dates';
  end if;
  if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
  if p_expected_rate is distinct from motor.daily_rate_centavos then raise exception 'booking_rate_changed'; end if;
  if private.booking_conflicts(motor.id,p_pickup_date,p_return_date) then raise exception 'booking_dates_unavailable'; end if;
  insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos)
    values(actor,motor.id,motor.name,p_pickup_date,p_return_date,motor.daily_rate_centavos) returning * into result;
  return result;
end;
$$;
create or replace function public.review_motor_booking(p_booking_id uuid, p_approve boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare motor public.motors; result public.bookings; target_motor uuid;
begin
  if not private.is_admin() then raise exception using errcode = '42501', message = 'booking_admin_required'; end if;
  select motor_id into target_motor from public.bookings where id = p_booking_id;
  select * into motor from public.motors where id = target_motor for update;
  select * into result from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if p_approve is null or result.status <> 'pending' then raise exception 'booking_not_pending'; end if;
  if p_approve then
    if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
    if result.pickup_date < (now() at time zone 'Asia/Manila')::date then raise exception 'booking_invalid_dates'; end if;
    if private.booking_conflicts(result.motor_id,result.pickup_date,result.return_date) then raise exception 'booking_dates_unavailable'; end if;
  end if;
  update public.bookings set status = case when p_approve then 'approved' else 'rejected' end where id = result.id returning * into result;
  return result;
end;
$$;
create or replace function public.motor_blocked_dates(p_motor_id uuid)
returns table(blocked_date date)
language plpgsql stable security definer set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Manila')::date;
begin
  if auth.uid() is null or not exists(select 1 from public.user_roles where user_id = auth.uid()) then
    raise exception using errcode = '42501', message = 'booking_client_required';
  end if;
  if not exists(select 1 from public.motors where id = p_motor_id and archived_at is null and operating_status = 'available') then
    raise exception 'booking_motor_unavailable';
  end if;
  return query
    select today + day_offset
    from pg_catalog.generate_series(0, 454) as days(day_offset)
    where exists (
      select 1 from public.bookings b where b.motor_id = p_motor_id and b.status in ('approved','in_use')
      and ((b.pickup_date <= today + day_offset and b.return_date > today + day_offset)
        or (b.status = 'in_use' and b.return_date <= today))
    ) order by 1;
end;
$$;

create function public.record_motor_handover(p_booking_id uuid, p_action text)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare motor public.motors; result public.bookings; target_motor uuid;
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
  if p_action is null or p_action not in ('pickup','return') then raise exception 'booking_invalid_action'; end if;
  select motor_id into target_motor from public.bookings where id=p_booking_id;
  select * into motor from public.motors where id=target_motor for update;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if p_action = 'pickup' then
    if result.status = 'in_use' then return result; end if;
    if result.status <> 'approved' then raise exception 'booking_invalid_transition'; end if;
    if result.pickup_date > today or result.return_date <= today then raise exception 'booking_pickup_outside_dates'; end if;
    if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
    if exists(select 1 from public.bookings where motor_id=target_motor and status='in_use' and id<>result.id) then
      raise exception 'booking_motor_still_out';
    end if;
    if private.booking_conflicts(target_motor,result.pickup_date,result.return_date,result.id) then raise exception 'booking_dates_unavailable'; end if;
    update public.bookings set status='in_use',picked_up_at=clock_timestamp(),picked_up_by=auth.uid()
      where id=result.id returning * into result;
  else
    if result.status = 'completed' then return result; end if;
    if result.status <> 'in_use' then raise exception 'booking_invalid_transition'; end if;
    update public.bookings set status='completed',returned_at=clock_timestamp(),returned_by=auth.uid()
      where id=result.id returning * into result;
  end if;
  return result;
end;
$$;
revoke all on function public.record_motor_handover(uuid,text) from public,anon,authenticated;
grant execute on function public.record_motor_handover(uuid,text) to authenticated;

create function private.guard_reserved_motor() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (new.archived_at is distinct from old.archived_at and new.archived_at is not null)
     or (new.operating_status is distinct from old.operating_status and new.operating_status <> 'available') then
    if exists(select 1 from public.bookings where motor_id=old.id
      and (status='in_use' or (status='approved' and return_date > (now() at time zone 'Asia/Manila')::date))) then
      raise exception 'motor_has_active_bookings';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reserved_motor() from public,anon,authenticated;
create trigger motors_guard_reservations before update on public.motors
for each row execute function private.guard_reserved_motor();
commit;

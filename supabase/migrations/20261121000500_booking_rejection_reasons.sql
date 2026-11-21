begin;
alter table public.bookings
  add column rejected_at timestamptz,
  add column rejected_by uuid references auth.users(id) on delete set null,
  add column rejection_reason text check (rejection_reason is null or char_length(rejection_reason) between 5 and 500);
alter table public.bookings add constraint bookings_rejection_record check (
  rejection_reason is null or (status='rejected' and rejected_at is not null)
);
create function public.admin_reject_booking(p_booking_id uuid,p_reason text)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare result public.bookings; target_motor uuid;
  reason text := btrim(regexp_replace(p_reason,'[[:space:]]+',' ','g'));
begin
  if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
  if reason is null or char_length(reason) not between 5 and 500 then raise exception 'booking_rejection_reason_required'; end if;
  select motor_id into target_motor from public.bookings where id=p_booking_id;
  perform id from public.motors where id=target_motor for update;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if result.status='rejected' and result.rejection_reason is not null then
    if result.rejection_reason=reason then return result; end if;
    raise exception 'booking_rejection_conflict';
  end if;
  if result.status<>'pending' then raise exception 'booking_not_pending'; end if;
  update public.bookings set status='rejected',rejected_at=clock_timestamp(),rejected_by=auth.uid(),rejection_reason=reason
    where id=result.id returning * into result;
  return result;
end;
$$;
revoke all on function public.admin_reject_booking(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_reject_booking(uuid,text) to authenticated;
-- Older clients cannot bypass the reason requirement via the boolean review RPC.
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
    if result.pickup_date < (now() at time zone 'Asia/Manila')::date then raise exception 'booking_invalid_dates'; end if;
    if private.booking_conflicts(result.motor_id,result.pickup_date,result.return_date) then raise exception 'booking_dates_unavailable'; end if;
  end if;
  update public.bookings set status = case when p_approve then 'approved' else 'rejected' end where id = result.id returning * into result;
  return result;
end;
$$;
commit;

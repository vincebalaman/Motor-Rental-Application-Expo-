begin;
-- Reveal occupied calendar dates only, never booking identities or client data.
-- 455 days covers the 365-day pickup horizon plus the maximum 90-day rental.
create function public.motor_blocked_dates(p_motor_id uuid)
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
      select 1 from public.bookings b where b.motor_id = p_motor_id and b.status = 'approved'
      and b.pickup_date <= today + day_offset and b.return_date > today + day_offset
    ) order by 1;
end;
$$;
revoke all on function public.motor_blocked_dates(uuid) from public, anon, authenticated;
grant execute on function public.motor_blocked_dates(uuid) to authenticated;
commit;

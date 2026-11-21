begin;

create function public.list_approved_motor_dates(
  p_motor_id uuid,
  p_from_date date,
  p_to_date date
)
returns table(pickup_date date, return_date date)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  if actor is null or not exists (
    select 1 from public.user_roles where user_id = actor and role = 'client'
  ) then
    raise exception using errcode = '42501', message = 'booking_client_required';
  end if;
  if p_motor_id is null or p_from_date is null or p_to_date is null
     or p_from_date < today or p_from_date > today + 365
     or p_to_date <= p_from_date or p_to_date > today + 456 then
    raise exception 'booking_invalid_dates';
  end if;

  return query
    select booking.pickup_date, booking.return_date
    from public.bookings as booking
    where booking.motor_id = p_motor_id
      and booking.status = 'approved'
      and booking.pickup_date < p_to_date
      and booking.return_date > p_from_date
    order by booking.pickup_date;
end;
$$;

revoke all on function public.list_approved_motor_dates(uuid, date, date) from public, anon, authenticated;
grant execute on function public.list_approved_motor_dates(uuid, date, date) to authenticated;

commit;

begin;
create function public.admin_booking_summary()
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
    count(*) filter (where b.status='in_use' and b.return_date<=day)
  from public.bookings b;
end;
$$;
revoke all on function public.admin_booking_summary() from public,anon,authenticated;
grant execute on function public.admin_booking_summary() to authenticated;
commit;

do $$ begin
  if (select count(*) from public.bookings where motor_id='10000000-0000-0000-0000-000000000002') <> 2 then
    raise exception 'Concurrent retries duplicated bookings';
  end if;
  if (select count(*) from public.bookings where motor_id='10000000-0000-0000-0000-000000000002' and status='approved') <> 1 then
    raise exception 'Concurrent approvals did not reserve exactly one motor';
  end if;
end $$;
select 'Concurrent booking retries and overlapping approval checks passed.' as result;

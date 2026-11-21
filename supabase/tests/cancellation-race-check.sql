do $$ begin
  if not exists(select 1 from public.bookings where id='81000000-0000-0000-0000-000000000001' and total_centavos=20000 and (
    (status='in_use' and picked_up_at is not null and cancellation_source is null and cancelled_at is null)
    or (status='cancelled' and picked_up_at is null and cancelled_at is not null and cancellation_source='admin' and cancellation_reason='Motor needs inspection')
  )) then raise exception 'Cancellation/pickup race did not produce exactly one coherent transition'; end if;
end $$;
select 'Concurrent cancellation and pickup produced one coherent outcome.' as result;

do $$ begin
 if not exists(select 1 from public.bookings where id='b1000000-0000-0000-0000-000000000001' and total_centavos=20000 and (
  (status='in_use' and picked_up_at is not null and no_show_at is null)
  or (status='no_show' and picked_up_at is null and no_show_at is not null and no_show_reason='Client missed pickup')
 )) then raise exception 'No-show/late pickup race produced invalid audit or status'; end if;
end $$;
select 'Concurrent no-show and late pickup produced one valid outcome.' as result;

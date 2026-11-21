do $$ begin
 if (select count(*) from public.notifications where booking_id='e3100000-0000-0000-0000-000000000001' and kind='pickup_reminder')<>1 then raise exception 'Concurrent inbox refresh duplicated reminders'; end if;
 if (select read_at from public.notifications where id='e3200000-0000-0000-0000-000000000001') is null then raise exception 'Concurrent read did not persist'; end if;
end $$;
select 'Notification privacy, reminder deduplication and concurrent read checks passed.' as result;

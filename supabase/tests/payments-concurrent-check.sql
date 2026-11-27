\set ON_ERROR_STOP on
do $$begin
 if (select count(*) from public.payments where booking_id='20000000-0000-0000-0000-000000000003')<>1 then raise exception 'Concurrent checkout created duplicate payment attempts';end if;
end$$;

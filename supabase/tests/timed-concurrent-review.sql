begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select id as booking_id from public.bookings where motor_id='d0000000-0000-0000-0000-000000000001' and client_id=:'booking_actor' \gset
select set_config('test.booking_id', :'booking_id', true);
do $$ begin
  perform public.review_motor_booking(current_setting('test.booking_id')::uuid,true);
exception when raise_exception then
  if sqlerrm <> 'booking_dates_unavailable' then raise; end if;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'booking_actor', true);
select public.request_motor_booking('10000000-0000-0000-0000-000000000002',current_date+10,current_date+12,10000);
commit;

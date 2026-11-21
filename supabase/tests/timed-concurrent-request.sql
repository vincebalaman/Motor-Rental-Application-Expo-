begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'booking_actor', true);
select public.request_timed_motor_booking('d0000000-0000-0000-0000-000000000001',((current_date+10)::timestamp at time zone 'Asia/Manila')+interval '9 hours',2,10000);
commit;

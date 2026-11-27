\set ON_ERROR_STOP on
begin;
set local role service_role;
select public.reserve_booking_checkout('20000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001',false);
select pg_sleep(0.2);
commit;

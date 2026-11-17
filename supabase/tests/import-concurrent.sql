\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
begin;
select public.import_local_motor(repeat('d',32),123,'Concurrent Import','Sport','Retry race',12345,'https://example.com/a.jpg');
select pg_sleep(0.3);
commit;

\set ON_ERROR_STOP on
begin;
create function pg_temp.calendar_assert(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('30000000-0000-0000-0000-000000000001','Calendar Motor','Scooter','Test',10000);
insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
select '00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Calendar Motor',
 (now() at time zone 'Asia/Manila')::date+start_day, (now() at time zone 'Asia/Manila')::date+end_day,10000, booking_status
from (values (2,4,'approved'),(5,7,'pending'),(8,10,'rejected'),(11,13,'cancelled'),(454,456,'approved')) fixtures(start_day,end_day,booking_status);
set local role anon;
do $$ begin
  perform * from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001');
  raise exception 'Guest read availability';
exception when insufficient_privilege then null; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.calendar_assert((select count(*)=0 from public.bookings where motor_id='30000000-0000-0000-0000-000000000001'),'other booking records remain private');
select pg_temp.calendar_assert((select count(*)=3 from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001')),'only occupied days in bounded horizon are returned');
select pg_temp.calendar_assert((select min(blocked_date)=(now() at time zone 'Asia/Manila')::date+2 from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001')),'pickup is occupied');
select pg_temp.calendar_assert(not exists(select 1 from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001') where blocked_date=(now() at time zone 'Asia/Manila')::date+4),'return is exclusive');
select pg_temp.calendar_assert((select max(blocked_date)=(now() at time zone 'Asia/Manila')::date+454 from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001')),'horizon bounded at final rental day');
select pg_temp.calendar_assert((select count(*)=1 from jsonb_object_keys((select to_jsonb(row_data) from (select * from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001') limit 1) row_data))),'availability returns no identities or other columns');
reset role;
delete from public.bookings where motor_id='30000000-0000-0000-0000-000000000001';
update public.motors set operating_status='maintenance' where id='30000000-0000-0000-0000-000000000001';
set local role authenticated;
do $$ begin
  begin
    perform * from public.motor_blocked_dates('30000000-0000-0000-0000-000000000001');
  exception when raise_exception then
    if sqlerrm='booking_motor_unavailable' then return; end if;
    raise;
  end;
  raise exception 'Maintenance motor returned availability';
end $$;
reset role;
rollback;
select 'Calendar availability privacy and boundary tests passed.' as result;

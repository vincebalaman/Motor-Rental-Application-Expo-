\set ON_ERROR_STOP on
begin;
create function pg_temp.dashboard_ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
set local role anon;
do $$ begin perform public.admin_booking_summary(); raise exception 'Guest read dashboard'; exception when insufficient_privilege then null; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$ begin perform public.admin_booking_summary(); raise exception 'Client read dashboard'; exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.dashboard_ok((select pending=0 and pickups_today=0 and returns_today=0 and in_use=0 and overdue=0 from public.admin_booking_summary()),'empty project returns zeros');
reset role;
insert into public.motors(id,name,type,description,daily_rate_centavos)
select ('60000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'Dashboard motor '||i,'Scooter','Test',10000 from generate_series(1,4) i;
insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
select '00000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','Dashboard motor',
(now() at time zone 'Asia/Manila')::date + ((i-1)%365),
(now() at time zone 'Asia/Manila')::date + ((i-1)%365) + ((i-1)/365)+1,10000,'pending' from generate_series(1,1001) i;
insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('00000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000001','Pickup today',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,10000,'approved');
insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,picked_up_at)
select '00000000-0000-0000-0000-000000000002',('60000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'In use',
(now() at time zone 'Asia/Manila')::date-2,(now() at time zone 'Asia/Manila')::date+offset_day,10000,'in_use',now()-interval '2 days'
from (values (2,-1),(3,0),(4,1)) fixture(i,offset_day);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.dashboard_ok((select today=(now() at time zone 'Asia/Manila')::date and pending=1001 and pickups_today=1 and returns_today=1 and in_use=3 and overdue=2 from public.admin_booking_summary()),'all counts use server day and are not limited by API row pagination');
select public.record_motor_handover((select id from public.bookings where motor_id='60000000-0000-0000-0000-000000000003'),'return');
select pg_temp.dashboard_ok((select returns_today=0 and in_use=2 and overdue=1 from public.admin_booking_summary()),'confirmed return removes remaining task counts');
reset role;
rollback;
select 'Admin dashboard permission and exact-count checks passed.' as result;

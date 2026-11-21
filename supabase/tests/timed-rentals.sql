\set ON_ERROR_STOP on
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.fails(query text,expected text) returns void language plpgsql as $$
begin begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end; raise exception 'Expected failure: %',expected; end $$;
select pg_temp.ok(private.completed_late_hours('2026-11-21 09:00+08','2026-11-21 09:59:59+08')=0,'partial first hour free');
select pg_temp.ok(private.completed_late_hours('2026-11-21 09:00+08','2026-11-21 10:00+08')=1,'first completed hour');
select pg_temp.ok(private.completed_late_hours('2026-11-21 09:00+08','2026-11-21 15:10+08')=6,'six hours ten minutes bills six');
select pg_temp.ok(private.completed_late_hours(null,now())=0,'legacy has no late hours');
select pg_temp.ok(not exists(select 1 from public.bookings where scheduled_pickup_at is not null or late_hours<>0 or late_fee_centavos<>0 or final_total_centavos<>total_centavos),'upgrade preserves all existing bookings and totals');
insert into public.motors(id,name,type,description,daily_rate_centavos) values
 ('c0000000-0000-0000-0000-000000000001','Timed motor','Scooter','Test',45000),
 ('c0000000-0000-0000-0000-000000000002','Late motor','Scooter','Test',70000),
 ('c0000000-0000-0000-0000-000000000003','Legacy motor','Scooter','Test',50000);
select date_trunc('minute',now())+interval '2 hours' as start_time \gset
set local role anon;
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',now(),1,45000)$q$,'permission denied');
select pg_temp.fails($q$select public.motor_booked_periods('c0000000-0000-0000-0000-000000000001')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',now(),1,45000)$q$,'booking_client_required');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails($q$select public.request_motor_booking('c0000000-0000-0000-0000-000000000001',current_date+1,current_date+2,45000)$q$,'booking_time_required');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',now()-interval '1 day',1,45000)$q$,'booking_invalid_times');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '400 days',1,45000)$q$,'booking_invalid_times');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '2 hours',0,45000)$q$,'booking_invalid_times');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '2 hours',91,45000)$q$,'booking_invalid_times');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '2 hours 1 second',1,45000)$q$,'booking_invalid_times');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '2 hours',1,1)$q$,'booking_rate_changed');
select (public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',:'start_time',2,45000)).id as booking_id \gset
select pg_temp.ok((public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',:'start_time',2,45000)).id=:'booking_id','retry same schedule is idempotent');
select pg_temp.ok((select scheduled_return_at=scheduled_pickup_at+interval '48 hours' and total_centavos=90000 and final_total_centavos=90000 and late_hour_rate_centavos=20000 from public.bookings where id=:'booking_id'),'server derives exact return, base and universal late rate');
select pg_temp.fails($q$update public.bookings set late_hours=0$q$,'permission denied');
select pg_temp.fails(format('select public.record_motor_handover(%L,''return'')',:'booking_id'),'booking_admin_required');
select pg_temp.ok((select count(*)=0 from public.motor_booked_periods('c0000000-0000-0000-0000-000000000001')),'pending does not reserve');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.ok((select count(*)=0 from public.bookings where id=:'booking_id'),'another client cannot read booking');
select (public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',:'start_time'::timestamptz+interval '1 hour',2,45000)).id as overlap_id \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.review_motor_booking(:'booking_id',true);
select pg_temp.fails(format('select public.review_motor_booking(%L,true)',:'overlap_id'),'booking_dates_unavailable');
select pg_temp.fails(format('select public.record_motor_handover(%L,''pickup'')',:'booking_id'),'booking_pickup_outside_dates');
select pg_temp.fails(format('select public.admin_mark_booking_no_show(%L,''Client missed pickup'')',:'booking_id'),'booking_no_show_too_early');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select count(*)=1 from public.motor_booked_periods('c0000000-0000-0000-0000-000000000001')),'approved reservation returns only merged interval');
select pg_temp.fails($q$select public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '3 hours',1,45000)$q$,'booking_dates_unavailable');
-- A request beginning at the exact return time is permitted.
select (public.request_timed_motor_booking('c0000000-0000-0000-0000-000000000001',:'start_time'::timestamptz+interval '48 hours',1,45000)).id as adjacent_id \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.review_motor_booking(:'adjacent_id',true);
select pg_temp.ok((select count(*)=1 and max(blocked_end)-min(blocked_start)=interval '72 hours' from public.motor_booked_periods('c0000000-0000-0000-0000-000000000001')),'adjacent reservations merge without losing exact times');
reset role;
-- Trusted fixtures simulate real elapsed time; no client or admin can set these directly.
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos,picked_up_at,picked_up_by)
select 'c1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','Late motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,70000,'in_use',s,s+interval '24 hours',20000,s,'00000000-0000-0000-0000-000000000003'
from (select now()-interval '30 hours 10 minutes' as s) fixture;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,picked_up_at)
values('c1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000003','Legacy motor',(now() at time zone 'Asia/Manila')::date-2,(now() at time zone 'Asia/Manila')::date-1,50000,'in_use',now()-interval '2 days');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select max(blocked_end)>now()+interval '455 days' from public.motor_booked_periods('c0000000-0000-0000-0000-000000000002')),'overdue motor blocks the whole horizon until returned');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_motor_handover('c1000000-0000-0000-0000-000000000001','return');
select pg_temp.ok((select status='completed' and late_hours=6 and late_fee_centavos=120000 and total_centavos=70000 and final_total_centavos=190000 and returned_by=auth.uid() from public.bookings where id='c1000000-0000-0000-0000-000000000001'),'server records six completed hours, fee and final total');
select returned_at as first_return from public.bookings where id='c1000000-0000-0000-0000-000000000001' \gset
select public.record_motor_handover('c1000000-0000-0000-0000-000000000001','return');
select pg_temp.ok((select returned_at=:'first_return'::timestamptz and final_total_centavos=190000 from public.bookings where id='c1000000-0000-0000-0000-000000000001'),'return retry never changes time or charges');
select pg_temp.ok((select count(*)=0 from public.motor_booked_periods('c0000000-0000-0000-0000-000000000002')),'completed return releases motor');
select public.record_motor_handover('c1000000-0000-0000-0000-000000000002','return');
select pg_temp.ok((select late_hours=0 and late_fee_centavos=0 and final_total_centavos=50000 from public.bookings where id='c1000000-0000-0000-0000-000000000002'),'legacy late return adds no retroactive fees');
reset role;
-- Timed handover and no-show eligibility uses the agreed clock time, even on the same date.
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'c1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','Late motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,70000,'approved',s,s+interval '24 hours',20000 from (select now()-interval '1 minute' as s) f;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_motor_handover('c1000000-0000-0000-0000-000000000003','pickup');
select pg_temp.ok((select status='in_use' and picked_up_at>=scheduled_pickup_at and scheduled_return_at-scheduled_pickup_at=interval '24 hours' from public.bookings where id='c1000000-0000-0000-0000-000000000003'),'actual pickup does not move scheduled return');
select pg_temp.fails($q$select public.admin_mark_booking_no_show('c1000000-0000-0000-0000-000000000003','Client missed pickup')$q$,'booking_no_show_not_eligible');
select public.record_motor_handover('c1000000-0000-0000-0000-000000000003','return');
select pg_temp.ok((select late_fee_centavos=0 and final_total_centavos=70000 from public.bookings where id='c1000000-0000-0000-0000-000000000003'),'early return has zero late charge and preserves base');
reset role;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'c1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002','Late motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,70000,'approved',s,s+interval '24 hours',20000 from (select now()-interval '1 minute' as s) f;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.admin_mark_booking_no_show('c1000000-0000-0000-0000-000000000004','Client missed agreed pickup');
select pg_temp.ok((select status='no_show' and late_fee_centavos=0 from public.bookings where id='c1000000-0000-0000-0000-000000000004'),'missed exact pickup can be explicitly closed without hourly charges');
rollback;

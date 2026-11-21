\set ON_ERROR_STOP on
begin;
create function pg_temp.no_show_ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.no_show_fails(query text,expected text) returns void language plpgsql as $$
begin begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end; raise exception 'Expected failure: %',expected; end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('a0000000-0000-0000-0000-000000000001','No-show motor','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
select ('a1000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','No-show motor',
(now() at time zone 'Asia/Manila')::date+offset_day,(now() at time zone 'Asia/Manila')::date+3,10000,booking_status
from (values(1,-1,'approved'),(2,0,'approved'),(3,1,'approved'),(4,-2,'pending')) fixture(i,offset_day,booking_status);
-- Only the first approved reservation is needed for the release check.
reset role;
set local role anon;
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001','Client missed pickup')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001','Client missed pickup')$q$,'booking_admin_required');
select pg_temp.no_show_fails($q$update public.bookings set status='no_show'$q$,'permission denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001','   ')$q$,'booking_no_show_reason_required');
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001',repeat('x',501))$q$,'booking_no_show_reason_required');
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000002','Client missed pickup')$q$,'booking_no_show_too_early');
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000003','Client missed pickup')$q$,'booking_no_show_too_early');
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000004','Client missed pickup')$q$,'booking_no_show_not_eligible');
reset role;
delete from public.bookings where id in ('a1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000003');
set local role authenticated;
select pg_temp.no_show_ok((select count(*)=3 from public.motor_blocked_dates('a0000000-0000-0000-0000-000000000001')),'approved dates occupied before no-show');
select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001',' Client   missed pickup ');
select pg_temp.no_show_ok((select status='no_show' and no_show_reason='Client missed pickup' and no_show_by=auth.uid() and no_show_at is not null and picked_up_at is null and returned_at is null and total_centavos=40000 from public.bookings where id='a1000000-0000-0000-0000-000000000001'),'no-show preserves total and records actor/time/reason');
select no_show_at as first_no_show from public.bookings where id='a1000000-0000-0000-0000-000000000001' \gset
select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001','Client missed pickup');
select pg_temp.no_show_ok((select no_show_at=:'first_no_show'::timestamptz from public.bookings where id='a1000000-0000-0000-0000-000000000001'),'retry preserves audit');
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000001','Different reason')$q$,'booking_no_show_conflict');
select pg_temp.no_show_ok((select count(*)=0 from public.motor_blocked_dates('a0000000-0000-0000-0000-000000000001')),'no-show frees remaining dates');
select pg_temp.no_show_fails($q$select public.record_motor_handover('a1000000-0000-0000-0000-000000000001','pickup')$q$,'booking_invalid_transition');
select pg_temp.no_show_fails($q$select public.admin_cancel_approved_booking('a1000000-0000-0000-0000-000000000001','Cannot overwrite no-show')$q$,'booking_cannot_admin_cancel');
select pg_temp.no_show_fails($q$select public.admin_reject_booking('a1000000-0000-0000-0000-000000000001','Cannot overwrite no-show')$q$,'booking_not_pending');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.no_show_ok((select no_show_reason='Client missed pickup' from public.bookings where id='a1000000-0000-0000-0000-000000000001'),'owner reads no-show reason');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.no_show_ok((select count(*)=0 from public.bookings where id='a1000000-0000-0000-0000-000000000001'),'other client cannot read no-show');
reset role;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,picked_up_at)
values ('a1000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','a0000000-0000-0000-0000-000000000001','In-use motor',current_date-1,current_date+1,10000,'in_use',now()-interval '1 day');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.no_show_fails($q$select public.admin_mark_booking_no_show('a1000000-0000-0000-0000-000000000005','Client missed pickup')$q$,'booking_no_show_not_eligible');
reset role;
rollback;
select 'No-show eligibility, audit, date release and privacy checks passed.' as result;

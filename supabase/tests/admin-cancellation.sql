\set ON_ERROR_STOP on
begin;
create function pg_temp.cancel_ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.cancel_fails(query text,expected text) returns void language plpgsql as $$
begin begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end; raise exception 'Expected failure: %',expected; end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('70000000-0000-0000-0000-000000000001','Cancellation motor','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('71000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','Cancellation motor',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,10000,'approved');
set local role anon;
select pg_temp.cancel_fails($q$select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001','Motor needs inspection')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.cancel_fails($q$select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001','Motor needs inspection')$q$,'booking_admin_required');
select pg_temp.cancel_fails($q$select public.cancel_motor_booking('71000000-0000-0000-0000-000000000001')$q$,'booking_not_pending');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.cancel_fails($q$select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001','   ')$q$,'booking_cancellation_reason_required');
select pg_temp.cancel_fails($q$select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001',repeat('x',501))$q$,'booking_cancellation_reason_required');
select pg_temp.cancel_ok((select count(*)=2 from public.motor_blocked_dates('70000000-0000-0000-0000-000000000001')),'approved booking reserves dates before cancellation');
select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001',' Motor   needs inspection ');
select pg_temp.cancel_ok((select status='cancelled' and cancellation_source='admin' and cancelled_by=auth.uid() and cancelled_at is not null and cancellation_reason='Motor needs inspection' and total_centavos=20000 and picked_up_at is null from public.bookings where id='71000000-0000-0000-0000-000000000001'),'cancellation preserves price and records actor time reason');
select pg_temp.cancel_ok((select count(*)=0 from public.motor_blocked_dates('70000000-0000-0000-0000-000000000001')),'cancel releases calendar dates');
select cancelled_at as first_cancelled from public.bookings where id='71000000-0000-0000-0000-000000000001' \gset
select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001','Motor needs inspection');
select pg_temp.cancel_ok((select cancelled_at=:'first_cancelled'::timestamptz from public.bookings where id='71000000-0000-0000-0000-000000000001'),'retry preserves cancellation time');
select pg_temp.cancel_fails($q$select public.admin_cancel_approved_booking('71000000-0000-0000-0000-000000000001','A different reason')$q$,'booking_cancellation_conflict');
select pg_temp.cancel_fails($q$select public.record_motor_handover('71000000-0000-0000-0000-000000000001','pickup')$q$,'booking_invalid_transition');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.cancel_ok((select cancellation_reason='Motor needs inspection' from public.bookings where id='71000000-0000-0000-0000-000000000001'),'client sees admin reason');
select pg_temp.cancel_fails($q$update public.bookings set cancellation_reason='Forged client change'$q$,'permission denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.cancel_ok((select count(*)=0 from public.bookings where id='71000000-0000-0000-0000-000000000001'),'other client cannot read cancellation');
select public.request_motor_booking('70000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,10000);
select id as new_booking from public.bookings where motor_id='70000000-0000-0000-0000-000000000001' and status='pending' \gset
select public.cancel_motor_booking(:'new_booking');
select pg_temp.cancel_ok((select cancellation_source='client' and cancelled_by=auth.uid() and cancellation_reason is null from public.bookings where id=:'new_booking'),'client pending cancellation attributed separately');
-- New request can be approved, but once picked up it cannot be cancelled.
select public.request_motor_booking('70000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,10000);
select id as active_booking from public.bookings where motor_id='70000000-0000-0000-0000-000000000001' and status='pending' \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.cancel_fails(format('select public.admin_cancel_approved_booking(%L,%L)',:'active_booking','Not approved yet'),'booking_cannot_admin_cancel');
select public.review_motor_booking(:'active_booking',true);
select public.record_motor_handover(:'active_booking','pickup');
select pg_temp.cancel_fails(format('select public.admin_cancel_approved_booking(%L,%L)',:'active_booking','Already out with client'),'booking_cannot_admin_cancel');
select public.record_motor_handover(:'active_booking','return');
select pg_temp.cancel_fails(format('select public.admin_cancel_approved_booking(%L,%L)',:'active_booking','Already returned'),'booking_cannot_admin_cancel');
reset role;
rollback;
select 'Admin cancellation, privacy, release and retry checks passed.' as result;

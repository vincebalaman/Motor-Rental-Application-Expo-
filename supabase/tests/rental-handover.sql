\set ON_ERROR_STOP on
begin;
create function pg_temp.handover_ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.handover_fails(query text,expected text) returns void language plpgsql as $$
begin
  begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end;
  raise exception 'Expected failure: %',expected;
end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos) values
('40000000-0000-0000-0000-000000000001','Handover motor','Scooter','Test',12345),
('40000000-0000-0000-0000-000000000002','Overdue motor','Scooter','Test',12345);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('41000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Handover motor',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,12345,'approved'),
('41000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000001','Handover motor',current_date+3,current_date+5,12345,'approved');
set local role anon;
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000001','pickup')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000001','pickup')$q$,'booking_admin_required');
select pg_temp.handover_fails($q$update public.bookings set picked_up_at=now(),status='in_use'$q$,'permission denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000001','return')$q$,'booking_invalid_transition');
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000002','pickup')$q$,'booking_pickup_outside_dates');
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000001','unknown')$q$,'booking_invalid_action');
select pg_temp.handover_fails($q$update public.motors set archived_at=now() where id='40000000-0000-0000-0000-000000000001'$q$,'motor_has_active_bookings');
select public.record_motor_handover('41000000-0000-0000-0000-000000000001','pickup');
select pg_temp.handover_ok((select status='in_use' and picked_up_at is not null and picked_up_by=auth.uid() and returned_at is null and total_centavos=24690 from public.bookings where id='41000000-0000-0000-0000-000000000001'),'pickup records state actor time and original total');
select picked_up_at as original_pickup from public.bookings where id='41000000-0000-0000-0000-000000000001' \gset
select public.record_motor_handover('41000000-0000-0000-0000-000000000001','pickup');
select pg_temp.handover_ok((select picked_up_at=:'original_pickup'::timestamptz from public.bookings where id='41000000-0000-0000-0000-000000000001'),'pickup retry preserves timestamp');
select pg_temp.handover_fails($q$update public.motors set operating_status='maintenance' where id='40000000-0000-0000-0000-000000000001'$q$,'motor_has_active_bookings');
select public.record_motor_handover('41000000-0000-0000-0000-000000000001','return');
select public.record_motor_handover('41000000-0000-0000-0000-000000000001','return');
select pg_temp.handover_ok((select status='completed' and returned_at>=picked_up_at and returned_by=auth.uid() and total_centavos=24690 from public.bookings where id='41000000-0000-0000-0000-000000000001'),'early return completes and preserves price');
select pg_temp.handover_fails($q$select public.record_motor_handover('41000000-0000-0000-0000-000000000001','pickup')$q$,'booking_invalid_transition');
reset role;
-- Simulate yesterday's rental still out, with a subsequent approved handover due today.
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,picked_up_at,picked_up_by)
values ('42000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','Overdue motor',current_date-2,current_date-1,12345,'in_use',now()-interval '2 days','00000000-0000-0000-0000-000000000003');
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values ('42000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Overdue motor',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+2,12345,'approved'),
('42000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','Overdue motor',current_date+10,current_date+12,12345,'pending');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.handover_ok((select count(*)=455 from public.motor_blocked_dates('40000000-0000-0000-0000-000000000002')),'overdue motor blocks entire calendar horizon');
select pg_temp.handover_fails($q$select public.request_motor_booking('40000000-0000-0000-0000-000000000002',current_date+15,current_date+17,12345)$q$,'booking_dates_unavailable');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.handover_fails($q$select public.review_motor_booking('42000000-0000-0000-0000-000000000003',true)$q$,'booking_dates_unavailable');
select pg_temp.handover_fails($q$select public.record_motor_handover('42000000-0000-0000-0000-000000000002','pickup')$q$,'booking_motor_still_out');
select public.record_motor_handover('42000000-0000-0000-0000-000000000001','return');
select public.record_motor_handover('42000000-0000-0000-0000-000000000002','pickup');
select pg_temp.handover_ok((select count(*)=1 from public.bookings where motor_id='40000000-0000-0000-0000-000000000002' and status='in_use'),'only one motor handover active');
select public.record_motor_handover('42000000-0000-0000-0000-000000000002','return');
update public.motors set archived_at=now() where id='40000000-0000-0000-0000-000000000002';
reset role;
rollback;
select 'Rental handover, audit, overdue and archive checks passed.' as result;

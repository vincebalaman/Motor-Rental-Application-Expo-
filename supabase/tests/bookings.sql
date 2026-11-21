\set ON_ERROR_STOP on
begin;
create function pg_temp.check_ok(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.fails(query text, expected text) returns void language plpgsql as $$
begin
  begin execute query; exception when others then
    if sqlerrm like '%' || expected || '%' then return; end if;
    raise exception 'Unexpected error: % (wanted %)', sqlerrm, expected;
  end;
  raise exception 'Expected failure: %', expected;
end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos) values
('10000000-0000-0000-0000-000000000001','Booking Motor','Scooter','Test',12345);
set local role anon;
select pg_temp.fails('select * from public.bookings','permission denied');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date,current_date+2,12345)$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails('insert into public.bookings default values','permission denied');
select pg_temp.fails('update public.bookings set status = ''approved''','permission denied');
select pg_temp.fails('delete from public.bookings','permission denied');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date-1,(now() at time zone 'Asia/Manila')::date+2,12345)$q$,'booking_invalid_dates');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+5,12345)$q$,'booking_invalid_dates');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+100,12345)$q$,'booking_invalid_dates');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+400,current_date+402,12345)$q$,'booking_invalid_dates');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+7,1)$q$,'booking_rate_changed');
select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+7,12345);
select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+7,12345);
select pg_temp.check_ok((select count(*)=1 from public.bookings),'retry returns same booking');
select pg_temp.check_ok((select total_centavos=24690 and client_id=auth.uid() and status='pending' from public.bookings),'server identity total and initial status');
select pg_temp.fails($q$select public.review_motor_booking((select id from public.bookings limit 1),true)$q$,'booking_admin_required');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.check_ok((select count(*)=0 from public.bookings),'other client cannot read booking');
reset role;
-- Get ID as operator, then try cancellation as another user.
select id as first_id from public.bookings where motor_id='10000000-0000-0000-0000-000000000001' \gset
set local role authenticated;
select pg_temp.fails(format('select public.cancel_motor_booking(%L)', :'first_id'),'booking_not_found');
-- Pending requests do not hold inventory.
select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+5,current_date+7,12345);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.check_ok((select count(*)=2 from public.bookings),'admin reads requests');
select public.review_motor_booking(:'first_id',true);
select pg_temp.fails(format('select public.review_motor_booking(%L,true)',(select id from public.bookings where status='pending')),'booking_dates_unavailable');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails(format('select public.cancel_motor_booking(%L)', :'first_id'),'booking_not_pending');
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+6,current_date+8,12345)$q$,'booking_dates_unavailable');
-- Adjacent ranges are permitted. Cancel is idempotent.
select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+7,current_date+8,12345);
select id as cancel_id from public.bookings where status='pending' \gset
select public.cancel_motor_booking(:'cancel_id');
select public.cancel_motor_booking(:'cancel_id');
select pg_temp.check_ok((select status='cancelled' from public.bookings where id=:'cancel_id'),'pending cancellation persisted');
reset role;
update public.motors set daily_rate_centavos=20000, name='Renamed Motor' where id='10000000-0000-0000-0000-000000000001';
select pg_temp.check_ok((select daily_rate_centavos=12345 and motor_name='Booking Motor' from public.bookings where id=:'first_id'),'snapshot survives catalog edits');
insert into public.motors(id,name,type,description,daily_rate_centavos,operating_status) values ('10000000-0000-0000-0000-000000000003','Maintenance motor','Scooter','Test',20000,'maintenance');
set local role authenticated;
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000003',current_date+10,current_date+12,20000)$q$,'booking_motor_unavailable');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.fails($q$select public.request_motor_booking('10000000-0000-0000-0000-000000000001',current_date+10,current_date+12,20000)$q$,'booking_client_required');
select pg_temp.fails('update public.bookings set status = ''approved''','permission denied');
select id as reject_id from public.bookings where motor_id='10000000-0000-0000-0000-000000000001' and status='pending' \gset
select public.review_motor_booking(:'reject_id',false);
select pg_temp.check_ok((select status='rejected' from public.bookings where id=:'reject_id'),'admin rejection persists');
select pg_temp.fails(format('select public.review_motor_booking(%L,true)', :'reject_id'),'booking_not_pending');
reset role;
update public.motors set operating_status='available' where id='10000000-0000-0000-0000-000000000001';
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos)
values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Old request',current_date-2,current_date-1,12345);
set local role authenticated;
select pg_temp.fails($q$select public.review_motor_booking('20000000-0000-0000-0000-000000000001',true)$q$,'booking_invalid_dates');
select public.review_motor_booking('20000000-0000-0000-0000-000000000001',false);
reset role;
rollback;

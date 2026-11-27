\set ON_ERROR_STOP on
begin;
create function pg_temp.pay_assert(value boolean,label text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'FAILED: %',label;end if;end;$$;
insert into auth.users(id,raw_user_meta_data) values
('10000000-0000-0000-0000-000000000001','{"full_name":"Payment Client"}'),
('10000000-0000-0000-0000-000000000002','{"full_name":"Other Payment Client"}');
insert into public.motors(id,name,type,description,daily_rate_centavos)values('10000000-0000-0000-0000-000000000003','Payment Motor','Scooter','Fixture',150000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select id::uuid,'10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Payment Motor',current_date+offset_days,current_date+offset_days+1,150000,status,now()+make_interval(days=>offset_days),now()+make_interval(days=>offset_days+1),20000
from(values('10000000-0000-0000-0000-000000000004','approved',7),('10000000-0000-0000-0000-000000000005','pending',9),('10000000-0000-0000-0000-000000000006','approved',11))v(id,status,offset_days);
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$begin
 perform public.reserve_booking_checkout('10000000-0000-0000-0000-000000000004',auth.uid(),false);
 raise exception 'Client invoked trusted reservation';exception when insufficient_privilege then null;end$$;
do $$begin
 perform public.settle_booking_payment(gen_random_uuid(),'cs_a','pay_a',1,'PHP',false);
 raise exception 'Client forged settlement';exception when insufficient_privilege then null;end$$;
do $$begin
 insert into public.payments(booking_id,client_id,provider,livemode,amount_centavos)values('10000000-0000-0000-0000-000000000004',auth.uid(),'paymongo',false,1);
 raise exception 'Client wrote payment';exception when insufficient_privilege then null;end$$;
reset role;
set local role service_role;
select (public.reserve_booking_checkout('10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',false)->'payment'->>'id') as payment_id \gset
select pg_temp.pay_assert((public.reserve_booking_checkout('10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',false)->>'created')::boolean=false,'retry reuses checkout');
select pg_temp.pay_assert((select amount_centavos=150000 from public.payments where id=:'payment_id'),'price comes from booking');
do $$begin
 perform public.reserve_booking_checkout('10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',false);
 raise exception 'Pending booking was payable';exception when raise_exception then if SQLERRM<>'payment_booking_not_payable' then raise;end if;end$$;
select public.attach_booking_checkout(:'payment_id','cs_test','https://checkout.paymongo.com/test');
do $$declare p uuid;begin
 select id into p from public.payments where checkout_session_id='cs_test';
 begin perform public.settle_booking_payment(p,'cs_test','pay_test',1,'PHP',false);raise exception 'Wrong amount accepted';exception when raise_exception then if SQLERRM<>'payment_verification_mismatch' then raise;end if;end;
 begin perform public.settle_booking_payment(p,'cs_test','pay_test',150000,'PHP',true);raise exception 'Wrong mode accepted';exception when raise_exception then if SQLERRM<>'payment_verification_mismatch' then raise;end if;end;
end$$;
select public.settle_booking_payment(:'payment_id','cs_test','pay_test',150000,'PHP',false);
select public.settle_booking_payment(:'payment_id','cs_test','pay_test',150000,'PHP',false);
select pg_temp.pay_assert((select count(*)=1 from public.payments where status='paid'),'settlement replay is idempotent');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select pg_temp.pay_assert((select count(*)=0 from public.payments),'other client cannot read payments');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select pg_temp.pay_assert((select count(*)=1 from public.payments),'owner can read payment');
do $$begin perform checkout_url from public.payments;raise exception 'Client read checkout secrets';exception when insufficient_privilege then null;end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_booking_cash('10000000-0000-0000-0000-000000000004');
select public.record_booking_cash('10000000-0000-0000-0000-000000000004');
select pg_temp.pay_assert((select count(*)=1 from public.payments where livemode and status='paid'),'cash receipt retry safe and test settlement not real money');
reset role;
set local role service_role;
select public.reserve_booking_checkout('10000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001',true);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$begin
 perform public.record_booking_cash('10000000-0000-0000-0000-000000000006');raise exception 'Cash allowed with active online checkout';
exception when raise_exception then if SQLERRM<>'payment_online_or_paid' then raise;end if;end$$;
reset role;
-- A real provider payment arriving after cancellation is retained for refund review.
update public.bookings set status='cancelled' where id='10000000-0000-0000-0000-000000000006';
set local role service_role;
select id as late_payment_id from public.payments where booking_id='10000000-0000-0000-0000-000000000006' and livemode \gset
select public.settle_booking_payment(:'late_payment_id','cs_late','pay_late',150000,'PHP',true);
select public.close_booking_payment(:'late_payment_id','expired');
select pg_temp.pay_assert((select status='paid' from public.payments where id=:'late_payment_id'),'paid cancellation retains money record; stale expiration cannot undo it');
reset role;
rollback;

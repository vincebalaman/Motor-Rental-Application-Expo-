\set ON_ERROR_STOP on
begin;
create function pg_temp.reject_ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.reject_fails(query text,expected text) returns void language plpgsql as $$
begin begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end; raise exception 'Expected failure: %',expected; end $$;
insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('90000000-0000-0000-0000-000000000001','Rejection motor','Scooter','Test',10000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
select ('91000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001','90000000-0000-0000-0000-000000000001','Rejection motor',
(now() at time zone 'Asia/Manila')::date+i,(now() at time zone 'Asia/Manila')::date+i+1,10000,booking_status
from (values(1,'pending'),(2,'approved'),(3,'rejected')) fixture(i,booking_status);
set local role anon;
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000001','Dates unavailable')$q$,'permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000001','Dates unavailable')$q$,'booking_admin_required');
select pg_temp.reject_fails($q$update public.bookings set rejection_reason='Forged decision'$q$,'permission denied');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.reject_fails($q$select public.review_motor_booking('91000000-0000-0000-0000-000000000001',false)$q$,'booking_rejection_reason_required');
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000001','   ')$q$,'booking_rejection_reason_required');
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000001',repeat('x',501))$q$,'booking_rejection_reason_required');
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000002','Already approved')$q$,'booking_not_pending');
select public.admin_reject_booking('91000000-0000-0000-0000-000000000001',' Dates   unavailable ');
select pg_temp.reject_ok((select status='rejected' and rejection_reason='Dates unavailable' and rejected_by=auth.uid() and rejected_at is not null and total_centavos=10000 from public.bookings where id='91000000-0000-0000-0000-000000000001'),'rejection audit and original total');
select rejected_at as first_rejected from public.bookings where id='91000000-0000-0000-0000-000000000001' \gset
select public.admin_reject_booking('91000000-0000-0000-0000-000000000001','Dates unavailable');
select pg_temp.reject_ok((select rejected_at=:'first_rejected'::timestamptz from public.bookings where id='91000000-0000-0000-0000-000000000001'),'retry preserves audit time');
select pg_temp.reject_fails($q$select public.admin_reject_booking('91000000-0000-0000-0000-000000000001','Different reason')$q$,'booking_rejection_conflict');
select pg_temp.reject_fails($q$select public.review_motor_booking('91000000-0000-0000-0000-000000000001',true)$q$,'booking_not_pending');
select pg_temp.reject_ok((select rejection_reason is null and rejected_at is null from public.bookings where id='91000000-0000-0000-0000-000000000003'),'legacy history has no invented reason or timestamp');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.reject_ok((select rejection_reason='Dates unavailable' from public.bookings where id='91000000-0000-0000-0000-000000000001'),'owner reads decision reason');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.reject_ok((select count(*)=0 from public.bookings where id='91000000-0000-0000-0000-000000000001'),'other client cannot read reason');
reset role;
rollback;
select 'Rejection reason validation, privacy and audit checks passed.' as result;

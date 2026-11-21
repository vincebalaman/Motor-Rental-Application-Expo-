\set ON_ERROR_STOP on
begin;
create function pg_temp.ok(value boolean,label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %',label; end if; end $$;
create function pg_temp.fails(query text,expected text) returns void language plpgsql as $$
begin begin execute query; exception when others then if sqlerrm like '%'||expected||'%' then return; end if; raise; end; raise exception 'Expected failure: %',expected; end $$;
select pg_temp.ok((select count(*)=0 from public.notifications),'migration does not invent historic decision notifications');
insert into auth.users(id,raw_user_meta_data) values('00000000-0000-0000-0000-000000000004','{"full_name":"Second admin"}');
update public.user_roles set role='admin' where user_id='00000000-0000-0000-0000-000000000004';
insert into public.motors(id,name,type,description,daily_rate_centavos)
values ('e0000000-0000-0000-0000-000000000001','Notification motor','Scooter','Test',45000),
 ('e0000000-0000-0000-0000-000000000002','Reminder motor','Scooter','Test',45000),
 ('e0000000-0000-0000-0000-000000000003','Overdue reminder motor','Scooter','Test',45000);
set local role anon;
select pg_temp.fails('select public.notification_inbox()','permission denied');
select pg_temp.fails('select public.mark_all_notifications_read()','permission denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails($q$select private.sync_booking_reminders(auth.uid(),'admin')$q$,'permission denied');
select pg_temp.fails('update public.notifications set read_at=now()','permission denied');
select pg_temp.fails($q$insert into public.notifications(recipient_id,audience,booking_id,kind,title,body) values(auth.uid(),'client',gen_random_uuid(),'approved','Forged','Forged')$q$,'permission denied');
select (public.request_timed_motor_booking('e0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '4 days',1,45000)).id as booking_id \gset
select public.request_timed_motor_booking('e0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '4 days',1,45000);
select pg_temp.ok((select count(*)=0 from public.notifications where booking_id=:'booking_id'),'client cannot read admin new-request alerts');
reset role;
select pg_temp.ok((select count(*)=2 from public.notifications where booking_id=:'booking_id' and kind='new_request'),'one alert per admin, duplicate request does not duplicate alerts');
select id as admin_notice from public.notifications where booking_id=:'booking_id' and recipient_id='00000000-0000-0000-0000-000000000003' \gset
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails(format('select public.mark_notification_read(%L)',:'admin_notice'),'notification_not_found');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.review_motor_booking(:'booking_id',true);
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id=:'booking_id' and kind='new_request'),'admin only sees their own notices');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id=:'booking_id' and kind='approved' and audience='client'),'approval creates a private client alert');
select id as client_notice from public.notifications where booking_id=:'booking_id' and kind='approved' \gset
select public.mark_notification_read(:'client_notice') as first_read \gset
select pg_temp.ok((public.mark_notification_read(:'client_notice')->'item'->>'read_at')=(:'first_read'::jsonb->'item'->>'read_at'),'read retries preserve original timestamp');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.ok((select count(*)=0 from public.notifications where booking_id=:'booking_id'),'another client cannot read alerts');
select pg_temp.fails(format('select public.mark_notification_read(%L)',:'client_notice'),'notification_not_found');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.admin_cancel_approved_booking(:'booking_id','Motor needs inspection');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select body like '%Motor needs inspection%' from public.notifications where booking_id=:'booking_id' and kind='cancelled'),'cancellation reason reaches the owner');
select (public.request_timed_motor_booking('e0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '5 days',1,45000)).id as reject_id \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.admin_reject_booking(:'reject_id','Schedule cannot be accommodated');
select public.admin_reject_booking(:'reject_id','Schedule cannot be accommodated');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select count(*)=1 and max(body) like '%Schedule cannot be accommodated%' from public.notifications where booking_id=:'reject_id' and kind='rejected'),'matching rejection retries preserve one reason alert');
-- Fixture pickup is in the next hour; legacy/timed availability rules remain unchanged.
reset role;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'e1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','Reminder motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,45000,'approved',s,s+interval '24 hours',20000 from (select now()+interval '1 hour' as s) f;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos,picked_up_at)
select 'e1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000003','Overdue reminder motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,45000,'in_use',s,s+interval '24 hours',20000,s from (select now()-interval '25 hours' as s) f;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.notification_inbox();
select public.notification_inbox();
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000001' and kind='pickup_reminder'),'pickup reminder appears once for owner');
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000002' and kind='overdue'),'overdue reminder appears once');
select pg_temp.ok((public.notification_inbox()->>'unread_count')::bigint=(select count(*) from public.notifications where read_at is null),'badge counts all unread owner alerts');
select pg_temp.fails($q$select public.notification_inbox(now(),null)$q$,'notification_invalid_cursor');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.notification_inbox();
select pg_temp.ok((select count(*)=0 from public.notifications where booking_id in ('e1000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000002')),'another client receives no reminder for someone else');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.notification_inbox();
select public.notification_inbox();
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000001' and kind='pickup_reminder'),'admin receives one pickup reminder');
select public.record_motor_handover('e1000000-0000-0000-0000-000000000002','return');
select public.record_motor_handover('e1000000-0000-0000-0000-000000000002','return');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000002' and kind='completed'),'return creates one completed alert');
-- Actual pickup/return events and near-term return reminders remain distinct.
reset role;
update public.bookings set scheduled_pickup_at=scheduled_pickup_at-interval '2 hours',scheduled_return_at=scheduled_return_at-interval '2 hours',
 pickup_date=((scheduled_pickup_at-interval '2 hours') at time zone 'Asia/Manila')::date,return_date=((scheduled_return_at-interval '2 hours') at time zone 'Asia/Manila')::date
 where id='e1000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_motor_handover('e1000000-0000-0000-0000-000000000001','pickup');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.notification_inbox();
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000001' and kind='in_use'),'pickup is recorded as one client alert');
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id='e1000000-0000-0000-0000-000000000001' and kind='return_reminder'),'active rental due in the next day receives one return reminder');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_motor_handover('e1000000-0000-0000-0000-000000000001','return');
reset role;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'e1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','Reminder motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,45000,'approved',s,s+interval '24 hours',20000 from (select now()-interval '1 minute' as s) f;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.admin_mark_booking_no_show('e1000000-0000-0000-0000-000000000003','Client missed agreed pickup');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.ok((select count(*)=1 and max(body) like '%Client missed agreed pickup%' from public.notifications where booking_id='e1000000-0000-0000-0000-000000000003' and kind='no_show'),'no-show notice includes the recorded reason');
select (public.request_timed_motor_booking('e0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '6 days',1,45000)).id as cancel_id \gset
select public.cancel_motor_booking(:'cancel_id');
select pg_temp.ok((select count(*)=1 from public.notifications where booking_id=:'cancel_id' and kind='cancelled'),'client sees their cancelled request');
reset role;
select pg_temp.ok((select count(*)=2 from public.notifications where booking_id=:'cancel_id' and kind='cancelled' and audience='admin'),'client cancellation alerts every admin once');
-- A failed booking transaction cannot leave an orphan notification.
create function pg_temp.rollback_booking() returns void language plpgsql as $$
begin
 perform public.request_timed_motor_booking('e0000000-0000-0000-0000-000000000001',date_trunc('minute',now())+interval '7 days',1,45000);
 raise exception 'test_booking_rollback';
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.fails('select pg_temp.rollback_booking()','test_booking_rollback');
reset role;
select pg_temp.ok(not exists(select 1 from public.bookings where motor_id='e0000000-0000-0000-0000-000000000001' and scheduled_pickup_at=date_trunc('minute',now())+interval '7 days'),'booking and notifications roll back together');
-- Cursor pagination is stable even when many alerts have the same timestamp.
reset role;
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
select ('e2000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','History motor',current_date+10+i,current_date+11+i,45000,'approved' from generate_series(1,61) i;
insert into public.notifications(recipient_id,audience,booking_id,kind,title,body,created_at)
select '00000000-0000-0000-0000-000000000001','client',id,'approved','History approval','Historical test alert','2020-01-01T00:00:00Z' from public.bookings where motor_name='History motor';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.notification_inbox() as page_one \gset
select pg_temp.ok(jsonb_array_length(:'page_one'::jsonb->'items')=50 and (:'page_one'::jsonb->>'has_more')::boolean,'inbox paginates at fifty and counts beyond that page');
select public.notification_inbox((:'page_one'::jsonb->'items'->49->>'created_at')::timestamptz,(:'page_one'::jsonb->'items'->49->>'id')::uuid) as page_two \gset
select pg_temp.ok(not exists(select 1 from jsonb_array_elements(:'page_one'::jsonb->'items') a join jsonb_array_elements(:'page_two'::jsonb->'items') b on a->>'id'=b->>'id'),'cursor pages never duplicate equal-timestamp records');
select public.mark_all_notifications_read();
select pg_temp.ok((select count(*)=0 from public.notifications where read_at is null),'mark all includes unread records beyond the loaded page');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.ok((select count(*)>0 from public.notifications where read_at is null),'client mark-all does not touch admin alerts');
select id as old_admin_notice from public.notifications limit 1 \gset
reset role;
update public.user_roles set role='client' where user_id='00000000-0000-0000-0000-000000000003';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.ok((select count(*)=0 from public.notifications),'role demotion hides old admin alerts');
select pg_temp.fails(format('select public.mark_notification_read(%L)',:'old_admin_notice'),'notification_not_found');
rollback;

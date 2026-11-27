\set ON_ERROR_STOP on
begin;
create function pg_temp.delete_ok(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label;end if;end;$$;
insert into public.motors(id,name,type,description,daily_rate_centavos)values('f1000000-0000-0000-0000-000000000001','Deletion motor','Scooter','Fixture',150000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status,scheduled_pickup_at,scheduled_return_at,late_hour_rate_centavos)
select 'f1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','Deletion motor',(s at time zone 'Asia/Manila')::date,((s+interval '24 hours') at time zone 'Asia/Manila')::date,150000,'approved',s,s+interval '24 hours',20000 from(select now()+interval '1 hour' as s)f;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.notification_inbox();
select id as reminder_id from public.notifications where booking_id='f1000000-0000-0000-0000-000000000002' and kind='pickup_reminder' \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$declare notice_id uuid;begin
 -- Known UUID is supplied separately below; another account must not delete it.
 begin perform public.delete_notification('f1000000-0000-0000-0000-000000000099');raise exception 'Unknown deletion accepted';exception when raise_exception then if SQLERRM<>'notification_not_found' then raise;end if;end;
end$$;
reset role;
-- Stable reference for cross-account tests without exposing a row via RLS.
insert into public.notifications(id,recipient_id,audience,booking_id,kind,title,body)
values('f1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','client','f1000000-0000-0000-0000-000000000002','rejected','Test alert','Deletion fixture') on conflict do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 begin perform public.delete_notification('f1000000-0000-0000-0000-000000000003');raise exception 'Other client deleted alert';exception when raise_exception then if SQLERRM<>'notification_not_found' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$begin
 begin perform public.delete_notification('f1000000-0000-0000-0000-000000000003');raise exception 'Admin deleted another recipient alert';exception when raise_exception then if SQLERRM<>'notification_not_found' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.delete_notification(:'reminder_id');
select public.delete_notification(:'reminder_id');
select pg_temp.delete_ok((select count(*)=0 from public.notifications where id=:'reminder_id'),'deleted alert hidden by direct RLS reads');
select public.notification_inbox();
select pg_temp.delete_ok((select count(*)=0 from public.notifications where booking_id='f1000000-0000-0000-0000-000000000002' and kind='pickup_reminder'),'polling does not resurrect deleted reminder');
select pg_temp.delete_ok((public.notification_inbox()->>'unread_count')::bigint=(select count(*) from public.notifications where read_at is null),'badge excludes deleted unread alert');
select public.mark_all_notifications_read();
select pg_temp.delete_ok((public.notification_inbox()->>'unread_count')::bigint=0,'mark all ignores deleted notifications');
reset role;
select pg_temp.delete_ok((select count(*)=1 from public.notifications where id=:'reminder_id' and dismissed_at is not null and read_at is null),'retained deduplication row is not marked read');
select pg_temp.delete_ok((select status='approved' from public.bookings where id='f1000000-0000-0000-0000-000000000002'),'notification deletion does not change booking');
set local role anon;
do $$begin perform public.delete_notification('f1000000-0000-0000-0000-000000000003');raise exception 'Guest deleted alert';exception when insufficient_privilege then null;end$$;
rollback;

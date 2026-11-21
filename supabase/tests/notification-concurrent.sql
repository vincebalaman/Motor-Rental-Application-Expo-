begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.notification_inbox();
select public.mark_notification_read('e3200000-0000-0000-0000-000000000001');
commit;

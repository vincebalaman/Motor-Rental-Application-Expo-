begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.record_motor_handover('51000000-0000-0000-0000-000000000001', :'handover_action');
commit;

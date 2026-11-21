begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select set_config('test.cancellation_action',:'race_action',true);
do $$ begin
  if current_setting('test.cancellation_action')='cancel' then
    perform public.admin_cancel_approved_booking('81000000-0000-0000-0000-000000000001','Motor needs inspection');
  else
    perform public.record_motor_handover('81000000-0000-0000-0000-000000000001','pickup');
  end if;
exception when raise_exception then
  if sqlerrm not in ('booking_cannot_admin_cancel','booking_invalid_transition') then raise; end if;
end $$;
commit;

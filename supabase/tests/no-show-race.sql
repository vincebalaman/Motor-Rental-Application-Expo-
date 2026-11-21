begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select set_config('test.no_show_action',:'race_action',true);
do $$ begin
 if current_setting('test.no_show_action')='no_show' then
  perform public.admin_mark_booking_no_show('b1000000-0000-0000-0000-000000000001','Client missed pickup');
 else
  perform public.record_motor_handover('b1000000-0000-0000-0000-000000000001','pickup');
 end if;
exception when raise_exception then
 if sqlerrm not in ('booking_no_show_not_eligible','booking_invalid_transition') then raise; end if;
end $$;
commit;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
do $$ declare result public.bookings; begin
 result:=public.record_motor_handover('d1000000-0000-0000-0000-000000000001','return');
 if result.status<>'completed' or result.late_hours<>6 or result.late_fee_centavos<>120000 or result.final_total_centavos<>130000
 or result.returned_at is distinct from (select returned_at from public.bookings where id=result.id) then
 raise exception 'Concurrent return changed or duplicated the final charge'; end if;
end $$;
commit;

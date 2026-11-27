\set ON_ERROR_STOP on
begin;
create function pg_temp.history_ok(value boolean,label text) returns void language plpgsql as $$begin if value is distinct from true then raise exception 'FAILED: %',label;end if;end;$$;
insert into public.motors(id,name,type,description,daily_rate_centavos)values('f2000000-0000-0000-0000-000000000001','History Motor','Scooter','Fixture',150000);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status)
values('f2000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','History Motor',current_date-3,current_date-2,150000,'cancelled'),
('f2000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','f2000000-0000-0000-0000-000000000001','History Motor',current_date+3,current_date+4,150000,'approved');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 begin perform public.hide_booking_history('f2000000-0000-0000-0000-000000000002');raise exception 'Other user removed history';exception when raise_exception then if SQLERRM<>'booking_not_found' then raise;end if;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$begin
 begin perform public.hide_booking_history('f2000000-0000-0000-0000-000000000003');raise exception 'Open booking removed';exception when raise_exception then if SQLERRM<>'booking_history_not_closed' then raise;end if;end;
 begin update public.bookings set client_history_hidden_at=now();raise exception 'Direct history update allowed';exception when insufficient_privilege then null;end;
 begin delete from public.bookings;raise exception 'Permanent booking deletion allowed';exception when insufficient_privilege then null;end;
end$$;
select public.hide_booking_history('f2000000-0000-0000-0000-000000000002')->>'hidden_at' as hidden_time \gset
select pg_temp.history_ok(public.hide_booking_history('f2000000-0000-0000-0000-000000000002')->>'hidden_at'=:'hidden_time','matching retry preserves timestamp');
select pg_temp.history_ok((select status='cancelled' and total_centavos=150000 and client_history_hidden_at is not null from public.bookings where id='f2000000-0000-0000-0000-000000000002'),'booking and price retained for owner detail links');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.history_ok((select count(*)=1 from public.bookings where id='f2000000-0000-0000-0000-000000000002'),'admin retains removed history');
do $$begin
 begin perform public.hide_booking_history('f2000000-0000-0000-0000-000000000002');raise exception 'Admin used client removal';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin perform public.hide_booking_history('f2000000-0000-0000-0000-000000000002');raise exception 'Guest removed history';exception when insufficient_privilege then null;end$$;
rollback;

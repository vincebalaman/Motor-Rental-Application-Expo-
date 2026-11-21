\set ON_ERROR_STOP on
begin;
create function pg_temp.check_ok(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %', label; end if; end $$;
create function pg_temp.fails(query text, expected text) returns void language plpgsql as $$
begin
  begin execute query; exception when others then
    if sqlerrm like '%' || expected || '%' then return; end if;
    raise exception 'Unexpected error: % (wanted %)', sqlerrm, expected;
  end;
  raise exception 'Expected failure: %', expected;
end $$;

insert into public.motors(id,name,type,description,daily_rate_centavos) values
('30000000-0000-0000-0000-000000000001','Availability Motor','Scooter','Test',12345);
insert into public.bookings(id,client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos,status) values
('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001',
 '30000000-0000-0000-0000-000000000001','Private booking name',
 (now() at time zone 'Asia/Manila')::date + 10,(now() at time zone 'Asia/Manila')::date + 12,12345,'approved'),
('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000002',
 '30000000-0000-0000-0000-000000000001','Pending request',
 (now() at time zone 'Asia/Manila')::date + 15,(now() at time zone 'Asia/Manila')::date + 17,12345,'pending');

set local role anon;
select pg_temp.fails(
  $q$select * from public.list_approved_motor_dates('30000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+456)$q$,
  'permission denied'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select pg_temp.check_ok((
  select count(*) = 1 and min(pickup_date) = (now() at time zone 'Asia/Manila')::date + 10
    and min(return_date) = (now() at time zone 'Asia/Manila')::date + 12
  from public.list_approved_motor_dates(
    '30000000-0000-0000-0000-000000000001',
    (now() at time zone 'Asia/Manila')::date,
    (now() at time zone 'Asia/Manila')::date + 456
  )
), 'client sees approved date ranges only');
select pg_temp.check_ok((
  select count(*) = 0 from public.list_approved_motor_dates(
    '30000000-0000-0000-0000-000000000001',
    (now() at time zone 'Asia/Manila')::date + 12,
    (now() at time zone 'Asia/Manila')::date + 13
  )
), 'exclusive return date permits adjacent rentals');
select pg_temp.check_ok((
  select count(*) = 0 from public.list_approved_motor_dates(
    '30000000-0000-0000-0000-000000000001',
    (now() at time zone 'Asia/Manila')::date + 15,
    (now() at time zone 'Asia/Manila')::date + 16
  )
), 'pending requests do not block availability');
select pg_temp.fails(
  $q$select * from public.list_approved_motor_dates('30000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+457)$q$,
  'booking_invalid_dates'
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.fails(
  $q$select * from public.list_approved_motor_dates('30000000-0000-0000-0000-000000000001',(now() at time zone 'Asia/Manila')::date,(now() at time zone 'Asia/Manila')::date+456)$q$,
  'booking_client_required'
);
reset role;
rollback;

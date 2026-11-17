\set ON_ERROR_STOP on
set role anon;
do $$ begin
  perform public.import_local_motor(repeat('a',32),1,'Denied','Sport','Denied',100,'https://example.com/a.jpg');
  raise exception 'Guest unexpectedly imported a motor';
exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$ begin
  perform public.import_local_motor(repeat('a',32),1,'Denied','Sport','Denied',100,'https://example.com/a.jpg');
  raise exception 'Client unexpectedly imported a motor';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$
declare first_id uuid; retry_id uuid; other_id uuid; before_count bigint;
begin
  first_id := public.import_local_motor(repeat('a',32),1,'Imported Scooter','Scooter','Original details',150050,'https://example.com/a.jpg');
  retry_id := public.import_local_motor(repeat('a',32),1,'Changed Local Name','Scooter','Changed details',999,'https://example.com/b.jpg');
  if first_id <> retry_id then raise exception 'Retry created a different motor'; end if;
  if (select name from public.motors where id = first_id) <> 'Imported Scooter' then raise exception 'Retry overwrote cloud edits'; end if;
  if (select daily_rate_centavos from public.motors where id = first_id) <> 150050 then raise exception 'Price changed on retry'; end if;
  if (select count(*) from public.motor_imports where source_id = repeat('a',32)) <> 1 then raise exception 'Duplicate mappings'; end if;
  update public.motors set archived_at = now() where id = first_id;
  retry_id := public.import_local_motor(repeat('a',32),1,'Retry Archived','Scooter','Retry',100,'https://example.com/a.jpg');
  if retry_id <> first_id or (select archived_at from public.motors where id = first_id) is null then raise exception 'Retry resurrected an archived motor'; end if;
  other_id := public.import_local_motor(repeat('b',32),1,'Another Unit','Sport','Other device',100,'https://example.com/a.jpg');
  if other_id = first_id then raise exception 'Different device identities collided'; end if;
  select count(*) into before_count from public.motors;
  begin
    perform public.import_local_motor(repeat('a',32),99,'Invalid','Sport','Invalid price',0,'https://example.com/a.jpg');
    raise exception 'Invalid price was accepted';
  exception when check_violation then null; end;
  if (select count(*) from public.motors) <> before_count then raise exception 'Failed import left a motor'; end if;
  if exists(select 1 from public.motor_imports where local_motor_id = 99) then raise exception 'Failed import left a mapping'; end if;
end;
$$;
do $$ begin
  insert into public.motor_imports (source_id,local_motor_id,motor_id) values (repeat('c',32),1,gen_random_uuid());
  raise exception 'Admin app unexpectedly wrote import mapping directly';
exception when insufficient_privilege then null; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.assert_true((select count(*) = 0 from public.motor_imports), 'client cannot read import mappings');
reset role;
select 'All local-import permission and retry checks passed.' as result;

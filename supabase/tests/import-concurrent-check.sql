\set ON_ERROR_STOP on
do $$
begin
  if (select count(*) from public.motor_imports where source_id = repeat('d',32) and local_motor_id = 123) <> 1
    or (select count(*) from public.motors where name = 'Concurrent Import') <> 1 then
    raise exception 'Concurrent imports duplicated a motor';
  end if;
end;
$$;
select 'Concurrent import requests created exactly one shared motor.' as result;

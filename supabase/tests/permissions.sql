\set ON_ERROR_STOP on
create function pg_temp.assert_true(value boolean, label text) returns void language plpgsql as $$
begin
  if value is distinct from true then raise exception 'FAILED: %', label; end if;
end;
$$;
insert into auth.users values
('00000000-0000-0000-0000-000000000002', '{"full_name":"Other Rider","role":"admin"}'),
('00000000-0000-0000-0000-000000000003', '{"full_name":"Shop Admin"}');
select pg_temp.assert_true((select count(*) = 3 from public.profiles), 'existing and new accounts get profiles');
select pg_temp.assert_true((select role = 'client' from public.user_roles where user_id = '00000000-0000-0000-0000-000000000002'), 'metadata cannot assign admin');
update public.user_roles set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000003';
insert into public.motors (name,type,description,daily_rate_centavos,image_path,archived_at) values
('Visible Motor','Scooter','Test ride',150000,'visible.jpg',null),
('Archived Motor','Scooter','Old ride',150000,'archived.jpg',now());
insert into storage.objects (bucket_id,name) values ('motor-images','visible.jpg'),('motor-images','archived.jpg'),('motor-images','unlinked.jpg');

set role anon;
do $$ begin
  perform * from public.motors;
  raise exception 'Guest unexpectedly read inventory';
exception when insufficient_privilege then null; end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'client reads own profile only');
select pg_temp.assert_true((select count(*) = 1 from public.user_roles), 'client reads own role only');
select pg_temp.assert_true(not private.is_admin(), 'client has no admin privileges');
update public.profiles set full_name = 'Updated Rider', phone = '+639171234567' where id = auth.uid();
select pg_temp.assert_true((select full_name = 'Updated Rider' from public.profiles where id = auth.uid()), 'client edits own profile');
select pg_temp.assert_true((select phone = '+639171234567' from public.profiles where id = auth.uid()), 'client edits own phone');
update public.profiles set full_name = 'Forbidden Change', phone = '00000000000' where id = '00000000-0000-0000-0000-000000000002';
do $$ begin
  update public.user_roles set role = 'admin' where user_id = auth.uid();
  raise exception 'Client unexpectedly changed role';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profiles set id = '00000000-0000-0000-0000-000000000004' where id = auth.uid();
  raise exception 'Client unexpectedly changed profile identity';
exception when insufficient_privilege then null; end $$;
select pg_temp.assert_true((select count(*) = 1 from public.motors), 'client cannot read archived motors');
do $$ begin
  insert into public.motors (name,type,description,daily_rate_centavos) values ('Forbidden','Sport','Test',100);
  raise exception 'Client unexpectedly created motor';
exception when insufficient_privilege then null; end $$;
update public.motors set daily_rate_centavos = 1;
select pg_temp.assert_true((select daily_rate_centavos = 150000 from public.motors), 'client cannot change price');
do $$ begin
  delete from public.motors;
  raise exception 'Client unexpectedly deleted motor';
exception when insufficient_privilege then null; end $$;
select pg_temp.assert_true((select count(*) = 1 from storage.objects), 'client reads linked active motor images only');
do $$ begin
  insert into storage.objects (bucket_id,name) values ('motor-images','forbidden.jpg');
  raise exception 'Client unexpectedly uploaded image';
exception when insufficient_privilege then null; end $$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select pg_temp.assert_true(private.is_admin(), 'trusted role assignment enables admin');
select pg_temp.assert_true((select count(*) = 3 from public.profiles), 'admin can read client profiles');
select pg_temp.assert_true((select phone = '+639171234567' from public.profiles where id = '00000000-0000-0000-0000-000000000001'), 'admin sees updated client phone');
select pg_temp.assert_true((select phone is null from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'client cannot alter another phone');
select pg_temp.assert_true((select full_name = 'Other Rider' from public.profiles where id = '00000000-0000-0000-0000-000000000002'), 'other profile was not modified');
select pg_temp.assert_true((select count(*) = 2 from public.motors), 'admin reads archived motors');
insert into public.motors (name,type,description,daily_rate_centavos) values ('New Motor','Sport','New ride',250000);
select pg_temp.assert_true((select created_by = auth.uid() from public.motors where name = 'New Motor'), 'creation actor comes from session');
update public.motors set daily_rate_centavos = 260000 where name = 'New Motor';
select pg_temp.assert_true((select daily_rate_centavos = 260000 from public.motors where name = 'New Motor'), 'admin updates motor');
do $$ begin
  insert into public.motors (name,type,description,daily_rate_centavos) values ('Invalid','Sport','Bad price',0);
  raise exception 'Invalid price unexpectedly accepted';
exception when check_violation then null; end $$;
do $$ begin
  update public.user_roles set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000002';
  raise exception 'App admin unexpectedly assigned another admin';
exception when insufficient_privilege then null; end $$;
insert into storage.objects (bucket_id,name) values ('motor-images','admin-upload.jpg');
delete from storage.objects where name = 'visible.jpg';
select pg_temp.assert_true((select count(*) = 1 from storage.objects where name = 'visible.jpg'), 'linked images cannot be deleted');
update public.motors set archived_at = now() where name = 'Visible Motor';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select pg_temp.assert_true((select count(*) = 1 from public.motors), 'archiving removes motor from client catalog');
select pg_temp.assert_true((select count(*) = 0 from storage.objects), 'archived images are not readable by clients');
reset role;
select 'All backend permission checks passed.' as result;

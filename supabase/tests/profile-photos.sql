\set ON_ERROR_STOP on
begin;
create function pg_temp.photo_assert(value boolean, label text) returns void language plpgsql as $$
begin if value is distinct from true then raise exception 'FAILED: %', label; end if; end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into storage.objects (bucket_id,name) values ('profile-images','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001.jpg');
insert into public.profile_photos values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000001.jpg');
select pg_temp.photo_assert((select count(*)=1 from public.profile_photos),'owner reads own photo');
do $$ begin
  insert into storage.objects (bucket_id,name) values ('profile-images','00000000-0000-0000-0000-000000000002/forbidden.jpg');
  raise exception 'Cross-user upload allowed';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.profile_photos set image_path='00000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000001.jpg';
  raise exception 'Cross-user reference allowed';
exception when check_violation then null; end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select pg_temp.photo_assert((select count(*)=0 from public.profile_photos),'other client cannot read photo reference');
select pg_temp.photo_assert((select count(*)=0 from storage.objects where bucket_id='profile-images'),'other client cannot read photo file');
update public.profile_photos set image_path='00000000-0000-0000-0000-000000000002/10000000-0000-0000-0000-000000000002.jpg' where user_id='00000000-0000-0000-0000-000000000001';
reset role;
select pg_temp.photo_assert((select image_path like '00000000-0000-0000-0000-000000000001/%' from public.profile_photos where user_id='00000000-0000-0000-0000-000000000001'),'other client cannot edit photo reference');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select pg_temp.photo_assert((select count(*)=0 from public.profile_photos),'admin cannot read another account photo');
select pg_temp.photo_assert((select count(*)=0 from storage.objects where bucket_id='profile-images'),'admin cannot read another account photo file');
rollback;

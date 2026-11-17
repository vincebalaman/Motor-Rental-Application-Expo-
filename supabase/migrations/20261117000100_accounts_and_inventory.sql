-- Apply to a Supabase development project. Booking tables/functions follow separately.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  phone text check (phone is null or char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'admin'))
);
create table public.motors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  type text not null check (char_length(btrim(type)) between 1 and 60),
  description text not null check (char_length(btrim(description)) between 1 and 5000),
  daily_rate_centavos bigint not null check (daily_rate_centavos between 1 and 100000000),
  image_path text,
  operating_status text not null default 'available' check (operating_status in ('available', 'maintenance')),
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger motors_updated_at before update on public.motors
for each row execute function private.set_updated_at();

create function private.create_user_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'Rider'));
  -- User-supplied metadata never determines administrative privileges.
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end;
$$;
revoke all on function private.create_user_profile() from public, anon, authenticated;
create trigger app_user_created after insert on auth.users
for each row execute function private.create_user_profile();
-- Also support users created in Auth before this migration was applied.
insert into public.profiles (id, full_name)
select id, coalesce(nullif(btrim(raw_user_meta_data ->> 'full_name'), ''), 'Rider') from auth.users;
insert into public.user_roles (user_id, role) select id, 'client' from auth.users;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.motors enable row level security;
revoke all on public.profiles, public.user_roles, public.motors from anon, authenticated;
grant select on public.profiles, public.user_roles, public.motors to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant insert (name, type, description, daily_rate_centavos, image_path, operating_status) on public.motors to authenticated;
grant update (name, type, description, daily_rate_centavos, image_path, operating_status, archived_at) on public.motors to authenticated;

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy roles_read on public.user_roles for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
-- No application role may write user_roles; trusted operators assign admins.
create policy motors_read on public.motors for select to authenticated
using (archived_at is null or (select private.is_admin()));
create policy motors_insert_admin on public.motors for insert to authenticated
with check ((select private.is_admin()));
create policy motors_update_admin on public.motors for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
-- Archiving preserves records. There is no authenticated DELETE permission.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('motor-images', 'motor-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);
create policy motor_images_read on storage.objects for select to authenticated
using (bucket_id = 'motor-images' and (
  (select private.is_admin()) or exists (
    select 1 from public.motors where image_path = storage.objects.name and archived_at is null
  )
));
create policy motor_images_insert_admin on storage.objects for insert to authenticated
with check (bucket_id = 'motor-images' and (select private.is_admin()));
create policy motor_images_update_admin on storage.objects for update to authenticated
using (bucket_id = 'motor-images' and (select private.is_admin()))
with check (bucket_id = 'motor-images' and (select private.is_admin()));
create policy motor_images_delete_admin on storage.objects for delete to authenticated
using (bucket_id = 'motor-images' and (select private.is_admin()) and not exists (
  select 1 from public.motors where image_path = storage.objects.name
));
commit;

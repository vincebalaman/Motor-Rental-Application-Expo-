-- Run once after the accounts/inventory migration.
begin;
create table public.motor_imports (
  source_id text not null check (source_id ~ '^[0-9a-f]{32}$'),
  local_motor_id bigint not null check (local_motor_id > 0),
  motor_id uuid not null references public.motors(id) on delete restrict,
  imported_by uuid references auth.users(id) on delete set null,
  imported_at timestamptz not null default now(),
  primary key (source_id, local_motor_id)
);
alter table public.motor_imports enable row level security;
revoke all on public.motor_imports from anon, authenticated;
grant select on public.motor_imports to authenticated;
create policy motor_imports_admin_read on public.motor_imports for select to authenticated
using ((select private.is_admin()));

create function public.import_local_motor(
  p_source_id text,
  p_local_motor_id bigint,
  p_name text,
  p_type text,
  p_description text,
  p_daily_rate_centavos bigint,
  p_image_url text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  imported_id uuid;
begin
  if not private.is_admin() then
    raise exception 'Only administrators may import motors' using errcode = '42501';
  end if;
  if p_source_id is null or p_source_id !~ '^[0-9a-f]{32}$' or p_local_motor_id is null or p_local_motor_id <= 0 then
    raise exception 'Invalid local import identity' using errcode = '22023';
  end if;
  -- Serialize retries/concurrent imports for this source record. The primary key
  -- additionally prevents duplicate mappings; the whole RPC is one transaction.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_source_id || ':' || p_local_motor_id::text, 0));
  select mi.motor_id into imported_id from public.motor_imports mi
  where mi.source_id = p_source_id and mi.local_motor_id = p_local_motor_id;
  if found then return imported_id; end if;
  if p_image_url is null or p_image_url !~ '^https://' then
    raise exception 'Import requires an HTTPS image URL' using errcode = '22023';
  end if;
  insert into public.motors (name, type, description, daily_rate_centavos, image_path, created_by)
  values (btrim(p_name), btrim(p_type), btrim(p_description), p_daily_rate_centavos, btrim(p_image_url), auth.uid())
  returning id into imported_id;
  insert into public.motor_imports (source_id, local_motor_id, motor_id, imported_by)
  values (p_source_id, p_local_motor_id, imported_id, auth.uid());
  return imported_id;
end;
$$;
revoke all on function public.import_local_motor(text, bigint, text, text, text, bigint, text) from public, anon;
grant execute on function public.import_local_motor(text, bigint, text, text, text, bigint, text) to authenticated;
commit;

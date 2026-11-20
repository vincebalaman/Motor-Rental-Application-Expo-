begin;
-- Return date is exclusive. Money is snapshotted in integer centavos.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references auth.users(id),
  motor_id uuid not null references public.motors(id),
  motor_name text not null,
  pickup_date date not null,
  return_date date not null,
  daily_rate_centavos bigint not null check (daily_rate_centavos between 1 and 100000000),
  total_centavos bigint generated always as (daily_rate_centavos * (return_date - pickup_date)) stored,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_date > pickup_date and return_date - pickup_date <= 90)
);
create index bookings_client_created on public.bookings(client_id, created_at desc);
create index bookings_motor_dates on public.bookings(motor_id, pickup_date, return_date) where status = 'approved';
create unique index bookings_active_request on public.bookings(client_id, motor_id, pickup_date, return_date)
where status in ('pending','approved');
create trigger bookings_updated_at before update on public.bookings
for each row execute function private.set_updated_at();
alter table public.bookings enable row level security;
revoke all on public.bookings from public, anon, authenticated;
grant select on public.bookings to authenticated;
create policy bookings_read on public.bookings for select to authenticated
using (client_id = (select auth.uid()) or (select private.is_admin()));

create function public.request_motor_booking(p_motor_id uuid, p_pickup_date date, p_return_date date, p_expected_rate bigint)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  today date := (now() at time zone 'Asia/Manila')::date;
  motor public.motors;
  result public.bookings;
begin
  if actor is null or not exists(select 1 from public.user_roles where user_id = actor and role = 'client') then
    raise exception using errcode = '42501', message = 'booking_client_required';
  end if;
  -- Serialize requests and future approvals per motor; also blocks concurrent catalog edits.
  select * into motor from public.motors where id = p_motor_id for update;
  if not found then raise exception 'booking_motor_unavailable'; end if;
  -- A retry after an uncertain response returns the original active request.
  select * into result from public.bookings where client_id = actor and motor_id = p_motor_id
    and pickup_date = p_pickup_date and return_date = p_return_date and status in ('pending','approved');
  if found then return result; end if;
  if p_pickup_date is null or p_return_date is null or p_pickup_date < today or p_pickup_date > today + 365
     or p_return_date <= p_pickup_date or p_return_date - p_pickup_date > 90 then
    raise exception 'booking_invalid_dates';
  end if;
  if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
  if p_expected_rate is distinct from motor.daily_rate_centavos then raise exception 'booking_rate_changed'; end if;
  if exists(select 1 from public.bookings where motor_id = motor.id and status = 'approved'
    and pickup_date < p_return_date and return_date > p_pickup_date) then raise exception 'booking_dates_unavailable'; end if;
  insert into public.bookings(client_id,motor_id,motor_name,pickup_date,return_date,daily_rate_centavos)
    values(actor,motor.id,motor.name,p_pickup_date,p_return_date,motor.daily_rate_centavos) returning * into result;
  return result;
end;
$$;
create function public.cancel_motor_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare result public.bookings;
begin
  select * into result from public.bookings where id = p_booking_id and client_id = auth.uid() for update;
  if not found then raise exception using errcode = '42501', message = 'booking_not_found'; end if;
  if result.status = 'cancelled' then return result; end if;
  if result.status <> 'pending' then raise exception 'booking_not_pending'; end if;
  update public.bookings set status = 'cancelled' where id = result.id returning * into result;
  return result;
end;
$$;
-- Admin UI follows later. This transition enforces availability atomically now.
create function public.review_motor_booking(p_booking_id uuid, p_approve boolean)
returns public.bookings language plpgsql security definer set search_path = '' as $$
declare motor public.motors; result public.bookings; target_motor uuid;
begin
  if not private.is_admin() then raise exception using errcode = '42501', message = 'booking_admin_required'; end if;
  select motor_id into target_motor from public.bookings where id = p_booking_id;
  select * into motor from public.motors where id = target_motor for update;
  select * into result from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if p_approve is null or result.status <> 'pending' then raise exception 'booking_not_pending'; end if;
  if p_approve then
    if motor.archived_at is not null or motor.operating_status <> 'available' then raise exception 'booking_motor_unavailable'; end if;
    if result.pickup_date < (now() at time zone 'Asia/Manila')::date then raise exception 'booking_invalid_dates'; end if;
    if exists(select 1 from public.bookings where motor_id = result.motor_id and status = 'approved'
      and pickup_date < result.return_date and return_date > result.pickup_date) then raise exception 'booking_dates_unavailable'; end if;
  end if;
  update public.bookings set status = case when p_approve then 'approved' else 'rejected' end where id = result.id returning * into result;
  return result;
end;
$$;
revoke all on function public.request_motor_booking(uuid,date,date,bigint), public.cancel_motor_booking(uuid), public.review_motor_booking(uuid,boolean) from public, anon, authenticated;
grant execute on function public.request_motor_booking(uuid,date,date,bigint), public.cancel_motor_booking(uuid), public.review_motor_booking(uuid,boolean) to authenticated;
commit;

begin;
create table public.payments (
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id),
 client_id uuid not null references auth.users(id),
 provider text not null check (provider in ('paymongo','cash')),
 livemode boolean not null,
 amount_centavos bigint not null check (amount_centavos > 0),
 currency text not null default 'PHP' check (currency='PHP'),
 status text not null default 'creating' check (status in ('creating','pending','paid','failed','expired')),
 checkout_session_id text unique,
 checkout_url text,
 provider_payment_id text unique,
 paid_at timestamptz,
 recorded_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (provider <> 'cash' or (livemode and status='paid')),
 check ((status='paid') = (paid_at is not null))
);
create unique index payments_one_active_base on public.payments(booking_id,livemode) where status in ('creating','pending','paid');
create index payments_booking on public.payments(booking_id,created_at desc);
create trigger payments_updated_at before update on public.payments for each row execute function private.set_updated_at();
alter table public.payments enable row level security;
revoke all on public.payments from public,anon,authenticated;
-- Hosted URLs remain server-only. A client requests its own URL through the function.
grant select(id,booking_id,client_id,provider,livemode,amount_centavos,currency,status,paid_at,created_at,recorded_by) on public.payments to authenticated;
create policy payments_read on public.payments for select to authenticated using (client_id=(select auth.uid()) or (select private.is_admin()));

-- Only the Edge Function may reserve a checkout. Amount and ownership are read
-- under a booking lock. Repeated create calls return the same active attempt.
create function public.reserve_booking_checkout(p_booking_id uuid,p_client_id uuid,p_livemode boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.bookings; p public.payments;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.client_id<>p_client_id or not exists(select 1 from public.user_roles where user_id=p_client_id and role='client') then raise exception 'payment_not_allowed'; end if;
 if b.status<>'approved' or coalesce(b.scheduled_pickup_at,b.pickup_date::timestamp at time zone 'Asia/Manila')<=clock_timestamp() then raise exception 'payment_booking_not_payable'; end if;
 if exists(select 1 from public.payments where booking_id=b.id and status='paid' and livemode) then raise exception 'payment_already_paid'; end if;
 select * into p from public.payments where booking_id=b.id and livemode=p_livemode and status in ('creating','pending','paid') for update;
 if found then return jsonb_build_object('created',false,'payment',to_jsonb(p)); end if;
 insert into public.payments(booking_id,client_id,provider,livemode,amount_centavos)
 values(b.id,b.client_id,'paymongo',p_livemode,b.total_centavos) returning * into p;
 return jsonb_build_object('created',true,'payment',to_jsonb(p));
end;
$$;

create function public.attach_booking_checkout(p_payment_id uuid,p_session_id text,p_url text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.payments;
begin
 select * into p from public.payments where id=p_payment_id for update;
 if not found or p.provider<>'paymongo' or p_session_id is null or p_session_id !~ '^cs_[A-Za-z0-9_-]+$' or p_url is null or p_url !~ '^https://checkout[.]paymongo[.]com/' then raise exception 'payment_invalid_checkout'; end if;
 if p.checkout_session_id is not null and p.checkout_session_id<>p_session_id then raise exception 'payment_session_conflict'; end if;
 update public.payments set checkout_session_id=p_session_id,checkout_url=p_url,
 status=case when status='creating' then 'pending' else status end where id=p.id;
end;
$$;

-- Provider-confirmed settlement only. It may arrive before the create response was
-- saved, or after a booking cancellation. Preserve the money record in both cases.
create function public.settle_booking_payment(p_payment_id uuid,p_session_id text,p_provider_payment_id text,p_amount bigint,p_currency text,p_livemode boolean)
returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; target uuid;
begin
 select booking_id into target from public.payments where id=p_payment_id;
 perform id from public.bookings where id=target for update;
 select * into p from public.payments where id=p_payment_id for update;
 if not found or p.provider<>'paymongo' or p.amount_centavos is distinct from p_amount or p_currency is distinct from 'PHP' or p.livemode is distinct from p_livemode or p_session_id is null or p_session_id !~ '^cs_[A-Za-z0-9_-]+$' or p_provider_payment_id is null or p_provider_payment_id !~ '^pay_[A-Za-z0-9_-]+$' then raise exception 'payment_verification_mismatch'; end if;
 if p.checkout_session_id is not null and p.checkout_session_id<>p_session_id then raise exception 'payment_session_conflict'; end if;
 if p.status='paid' then
  if p.provider_payment_id<>p_provider_payment_id then raise exception 'payment_duplicate_settlement'; end if;
  return;
 end if;
 update public.payments set status='paid',checkout_session_id=p_session_id,provider_payment_id=p_provider_payment_id,paid_at=clock_timestamp() where id=p.id;
end;
$$;

-- Failed creation must be definitive; timeouts remain creating until reconciled.
-- Expired means the provider actually confirmed expiration, not a cancelled browser.
create function public.close_booking_payment(p_payment_id uuid,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare p public.payments; target uuid;
begin
 if p_status is null or p_status not in ('failed','expired') then raise exception 'payment_invalid_status'; end if;
 select booking_id into target from public.payments where id=p_payment_id;
 perform id from public.bookings where id=target for update;
 select * into p from public.payments where id=p_payment_id for update;
 if not found or p.provider<>'paymongo' then raise exception 'payment_not_found'; end if;
 if p.status='paid' then return; end if;
 if p_status='failed' and p.checkout_session_id is not null then raise exception 'payment_session_must_expire'; end if;
 update public.payments set status=p_status where id=p.id;
end;
$$;

create function public.record_booking_cash(p_booking_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.bookings; p public.payments;
begin
 if not private.is_admin() then raise exception 'payment_admin_required'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found or b.status not in ('approved','in_use','completed') then raise exception 'payment_booking_not_payable'; end if;
 select * into p from public.payments where booking_id=b.id and livemode and status in ('creating','pending','paid') for update;
 if found then
  if p.status='paid' and p.provider='cash' then return p.id; end if;
  raise exception 'payment_online_or_paid';
 end if;
 insert into public.payments(booking_id,client_id,provider,livemode,amount_centavos,status,paid_at,recorded_by)
 values(b.id,b.client_id,'cash',true,b.total_centavos,'paid',clock_timestamp(),auth.uid()) returning * into p;
 return p.id;
end;
$$;

revoke all on function public.reserve_booking_checkout(uuid,uuid,boolean),public.attach_booking_checkout(uuid,text,text),public.settle_booking_payment(uuid,text,text,bigint,text,boolean),public.close_booking_payment(uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_booking_checkout(uuid,uuid,boolean),public.attach_booking_checkout(uuid,text,text),public.settle_booking_payment(uuid,text,text,bigint,text,boolean),public.close_booking_payment(uuid,text) to service_role;
grant select on public.payments to service_role;
revoke all on function public.record_booking_cash(uuid) from public,anon;
grant execute on function public.record_booking_cash(uuid) to authenticated;
commit;

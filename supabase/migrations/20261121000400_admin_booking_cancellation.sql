begin;
alter table public.bookings
  add column cancelled_at timestamptz,
  add column cancelled_by uuid references auth.users(id) on delete set null,
  add column cancellation_source text check (cancellation_source in ('client','admin')),
  add column cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) between 5 and 500);
alter table public.bookings add constraint bookings_cancellation_record check (
  cancellation_source is null or (status='cancelled' and cancelled_at is not null
    and (cancellation_source='client' or cancellation_reason is not null))
);

create function public.admin_cancel_approved_booking(p_booking_id uuid,p_reason text)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare result public.bookings; target_motor uuid;
  reason text := btrim(regexp_replace(p_reason,'[[:space:]]+',' ','g'));
begin
  if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
  if reason is null or char_length(reason) not between 5 and 500 then raise exception 'booking_cancellation_reason_required'; end if;
  -- Same lock order as approval and pickup: only one transition can win.
  select motor_id into target_motor from public.bookings where id=p_booking_id;
  perform id from public.motors where id=target_motor for update;
  select * into result from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if result.status='cancelled' and result.cancellation_source='admin' then
    if result.cancellation_reason=reason then return result; end if;
    raise exception 'booking_cancellation_conflict';
  end if;
  if result.status<>'approved' then raise exception 'booking_cannot_admin_cancel'; end if;
  update public.bookings set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=auth.uid(),
    cancellation_source='admin',cancellation_reason=reason where id=result.id returning * into result;
  return result;
end;
$$;
revoke all on function public.admin_cancel_approved_booking(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_cancel_approved_booking(uuid,text) to authenticated;

-- Retain existing client permissions: own pending requests only, with actor attribution.
create or replace function public.cancel_motor_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare result public.bookings;
begin
  select * into result from public.bookings where id=p_booking_id and client_id=auth.uid() for update;
  if not found then raise exception using errcode='42501',message='booking_not_found'; end if;
  if result.status='cancelled' then return result; end if;
  if result.status<>'pending' then raise exception 'booking_not_pending'; end if;
  update public.bookings set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by=auth.uid(),
    cancellation_source='client' where id=result.id returning * into result;
  return result;
end;
$$;
commit;

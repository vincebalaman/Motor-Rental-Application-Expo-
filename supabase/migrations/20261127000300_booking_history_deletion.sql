-- Requires shared bookings. Does not depend on PayMongo/payment setup.
begin;
alter table public.bookings add column client_history_hidden_at timestamptz;
create function public.hide_booking_history(p_booking_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); b public.bookings;
begin
 if actor is null or not exists(select 1 from public.user_roles where user_id=actor and role='client') then raise exception using errcode='42501',message='booking_client_required'; end if;
 select * into b from public.bookings where id=p_booking_id and client_id=actor for update;
 if not found then raise exception 'booking_not_found'; end if;
 if b.status not in ('completed','cancelled','rejected','no_show') then raise exception 'booking_history_not_closed'; end if;
 if b.client_history_hidden_at is null then
  update public.bookings set client_history_hidden_at=clock_timestamp() where id=b.id returning * into b;
 end if;
 return jsonb_build_object('id',b.id,'client_id',b.client_id,'hidden_at',b.client_history_hidden_at);
end;
$$;
revoke all on function public.hide_booking_history(uuid) from public,anon,authenticated;
grant execute on function public.hide_booking_history(uuid) to authenticated;
-- No DELETE/direct UPDATE permission: rental/payment/admin records are retained.
commit;

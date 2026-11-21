begin;
alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
 check (status in ('pending','approved','in_use','completed','rejected','cancelled','no_show'));
alter table public.bookings
 add column no_show_at timestamptz,
 add column no_show_by uuid references auth.users(id) on delete set null,
 add column no_show_reason text;
alter table public.bookings add constraint bookings_no_show_record check (
 (status='no_show' and no_show_at is not null and no_show_reason is not null and char_length(no_show_reason) between 5 and 500 and picked_up_at is null and returned_at is null)
 or (status<>'no_show' and no_show_at is null and no_show_by is null and no_show_reason is null)
);
create function public.admin_mark_booking_no_show(p_booking_id uuid,p_reason text)
returns public.bookings language plpgsql security definer set search_path='' as $$
declare result public.bookings; target_motor uuid;
 reason text := btrim(regexp_replace(p_reason,'[[:space:]]+',' ','g'));
begin
 if not private.is_admin() then raise exception using errcode='42501',message='booking_admin_required'; end if;
 if reason is null or char_length(reason) not between 5 and 500 then raise exception 'booking_no_show_reason_required'; end if;
 select motor_id into target_motor from public.bookings where id=p_booking_id;
 perform id from public.motors where id=target_motor for update;
 select * into result from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'booking_not_found'; end if;
 if result.status='no_show' then
   if result.no_show_reason=reason then return result; end if;
   raise exception 'booking_no_show_conflict';
 end if;
 if result.status<>'approved' or result.picked_up_at is not null then raise exception 'booking_no_show_not_eligible'; end if;
 if result.pickup_date >= (clock_timestamp() at time zone 'Asia/Manila')::date then raise exception 'booking_no_show_too_early'; end if;
 update public.bookings set status='no_show',no_show_at=clock_timestamp(),no_show_by=auth.uid(),no_show_reason=reason
  where id=result.id returning * into result;
 return result;
end;
$$;
revoke all on function public.admin_mark_booking_no_show(uuid,text) from public,anon,authenticated;
grant execute on function public.admin_mark_booking_no_show(uuid,text) to authenticated;
commit;

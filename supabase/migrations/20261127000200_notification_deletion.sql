-- Requires booking notifications (008). Independent of payment setup.
begin;
alter table public.notifications add column dismissed_at timestamptz;
-- Keep deduplication keys so deleted reminders cannot reappear on the next poll.
drop policy notifications_owner_read on public.notifications;
create policy notifications_owner_read on public.notifications for select to authenticated using (
 dismissed_at is null and recipient_id=(select auth.uid()) and exists(
 select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role=audience)
);
create or replace function public.notification_inbox(p_before_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; result jsonb; unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 if (p_before_at is null)<>(p_before_id is null) or (p_before_at is not null and not isfinite(p_before_at)) then raise exception 'notification_invalid_cursor'; end if;
 perform private.sync_booking_reminders(actor,actor_role);
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and dismissed_at is null and read_at is null;
 with page as (
   select n.* from public.notifications n where n.recipient_id=actor and n.audience=actor_role and n.dismissed_at is null
   and (p_before_at is null or (n.created_at,n.id)<(p_before_at,p_before_id))
   order by n.created_at desc,n.id desc limit 51
 ), displayed as (select * from page order by created_at desc,id desc limit 50)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id desc) from displayed d),'[]'::jsonb),
   'unread_count',unread,'has_more',(select count(*)>50 from page)) into result;
 return result;
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; result public.notifications; unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 update public.notifications set read_at=coalesce(read_at,clock_timestamp())
 where id=p_notification_id and recipient_id=actor and audience=actor_role and dismissed_at is null returning * into result;
 if not found then raise exception 'notification_not_found'; end if;
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and dismissed_at is null and read_at is null;
 return jsonb_build_object('item',to_jsonb(result),'unread_count',unread);
end;
$$;
create or replace function public.mark_all_notifications_read()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; event_time timestamptz:=clock_timestamp(); unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 update public.notifications set read_at=event_time where recipient_id=actor and audience=actor_role and dismissed_at is null and read_at is null and created_at<=event_time;
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and dismissed_at is null and read_at is null;
 return jsonb_build_object('read_at',event_time,'unread_count',unread);
end;
$$;

create function public.delete_notification(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; result public.notifications; unread bigint;
begin
 select role into actor_role from public.user_roles where user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 update public.notifications set dismissed_at=coalesce(dismissed_at,clock_timestamp())
 where id=p_notification_id and recipient_id=actor and audience=actor_role returning * into result;
 if not found then raise exception 'notification_not_found'; end if;
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and dismissed_at is null and read_at is null;
 return jsonb_build_object('id',result.id,'recipient_id',result.recipient_id,'audience',result.audience,'unread_count',unread);
end;
$$;
revoke all on function public.delete_notification(uuid) from public,anon,authenticated;
grant execute on function public.delete_notification(uuid) to authenticated;
commit;

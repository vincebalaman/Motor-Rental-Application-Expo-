begin;
create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references auth.users(id) on delete cascade,
 audience text not null check (audience in ('client','admin')),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 kind text not null check (kind in ('new_request','approved','rejected','cancelled','in_use','completed','no_show','pickup_reminder','return_reminder','overdue')),
 title text not null check (char_length(title) between 1 and 160),
 body text not null check (char_length(body) between 1 and 1200),
 created_at timestamptz not null default clock_timestamp(),
 read_at timestamptz check (read_at is null or read_at>=created_at),
 unique(recipient_id,audience,booking_id,kind)
);
create index notifications_inbox on public.notifications(recipient_id,audience,created_at desc,id desc);
create index notifications_unread on public.notifications(recipient_id,audience) where read_at is null;
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant select on public.notifications to authenticated;
create policy notifications_owner_read on public.notifications for select to authenticated using (
 recipient_id=(select auth.uid()) and exists(select 1 from public.user_roles r where r.user_id=(select auth.uid()) and r.role=audience)
);

-- Events are inserted in the same transaction as the booking decision. No historic
-- decisions are backfilled. ON CONFLICT makes retries/concurrent reads harmless.
create function private.notify_booking_event() returns trigger
language plpgsql security definer set search_path='' as $$
declare event_title text; event_body text;
begin
 if tg_op='INSERT' then
   if new.status<>'pending' then return new; end if;
   insert into public.notifications(recipient_id,audience,booking_id,kind,title,body)
   select r.user_id,'admin',new.id,'new_request','New booking request','A client requested '||new.motor_name||'. Open the booking to review the schedule.'
   from public.user_roles r where r.role='admin' on conflict do nothing;
   return new;
 end if;
 if new.status is not distinct from old.status then return new; end if;
 case new.status
 when 'approved' then event_title:='Booking approved'; event_body:='Your booking for '||new.motor_name||' is approved. Check your pickup and return schedule.';
 when 'rejected' then event_title:='Booking declined'; event_body:='Your request for '||new.motor_name||' was declined.'||case when new.rejection_reason is not null then ' Reason: '||new.rejection_reason else '' end;
 when 'cancelled' then event_title:='Booking cancelled'; event_body:=case when new.cancellation_source='client' then 'You cancelled your request for ' else 'The rental shop cancelled your booking for ' end||new.motor_name||'.'||case when new.cancellation_reason is not null then ' Reason: '||new.cancellation_reason else '' end;
 when 'in_use' then event_title:='Pickup confirmed'; event_body:='Pickup of '||new.motor_name||' was recorded. Please return the motor by the agreed time.';
 when 'completed' then event_title:='Return confirmed'; event_body:='The return of '||new.motor_name||' was recorded. Open the booking to see your final charges.';
 when 'no_show' then event_title:='Missed pickup recorded'; event_body:='The rental shop marked your '||new.motor_name||' booking as a no-show.'||case when new.no_show_reason is not null then ' Reason: '||new.no_show_reason else '' end;
 else return new;
 end case;
 insert into public.notifications(recipient_id,audience,booking_id,kind,title,body)
 values(new.client_id,'client',new.id,new.status,event_title,event_body) on conflict do nothing;
 if new.status='cancelled' and new.cancellation_source='client' then
   insert into public.notifications(recipient_id,audience,booking_id,kind,title,body)
   select r.user_id,'admin',new.id,'cancelled','Client cancelled a request','A client cancelled their request for '||new.motor_name||'.'
   from public.user_roles r where r.role='admin' on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function private.notify_booking_event() from public,anon,authenticated;
create trigger bookings_notifications after insert or update of status on public.bookings
for each row execute function private.notify_booking_event();

-- In-app reminders are generated for the authenticated recipient when they refresh
-- the inbox. They do not schedule phone alerts or claim to run while the app is closed.
create function private.sync_booking_reminders(p_actor uuid,p_role text) returns void
language plpgsql security definer set search_path='' as $$
declare event_time timestamptz:=clock_timestamp(); day date;
begin
 day:=(event_time at time zone 'Asia/Manila')::date;
 insert into public.notifications(recipient_id,audience,booking_id,kind,title,body)
 select p_actor,p_role,b.id,reminder.kind,reminder.title,
   reminder.prefix||b.motor_name||'. Open the booking for the agreed schedule.'
 from public.bookings b cross join lateral (
   select 'pickup_reminder'::text as kind,'Upcoming pickup'::text as title,'Pickup is coming up for '::text as prefix
   where b.status='approved' and b.picked_up_at is null and (
     (b.scheduled_pickup_at>event_time and b.scheduled_pickup_at<=event_time+interval '24 hours')
     or (b.scheduled_pickup_at is null and b.pickup_date=day and b.return_date>day))
   union all
   select 'return_reminder','Return reminder','Return is coming up for '
   where b.status='in_use' and (
     (b.scheduled_return_at>event_time and b.scheduled_return_at<=event_time+interval '24 hours')
     or (b.scheduled_return_at is null and b.return_date=day+1))
   union all
   select 'overdue','Return overdue','The motor is still recorded as in use past its return schedule: '
   where b.status='in_use' and (
     (b.scheduled_return_at<=event_time) or (b.scheduled_return_at is null and b.return_date<=day))
 ) reminder
 where (p_role='admin' or b.client_id=p_actor)
 order by b.id,reminder.kind
 on conflict do nothing;
end;
$$;
revoke all on function private.sync_booking_reminders(uuid,text) from public,anon,authenticated;

create function public.notification_inbox(p_before_at timestamptz default null,p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; result jsonb; unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 if (p_before_at is null)<>(p_before_id is null) or (p_before_at is not null and not isfinite(p_before_at)) then raise exception 'notification_invalid_cursor'; end if;
 perform private.sync_booking_reminders(actor,actor_role);
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and read_at is null;
 with page as (
   select n.* from public.notifications n where n.recipient_id=actor and n.audience=actor_role
   and (p_before_at is null or (n.created_at,n.id)<(p_before_at,p_before_id))
   order by n.created_at desc,n.id desc limit 51
 ), displayed as (select * from page order by created_at desc,id desc limit 50)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc,d.id desc) from displayed d),'[]'::jsonb),
   'unread_count',unread,'has_more',(select count(*)>50 from page)) into result;
 return result;
end;
$$;

create function public.mark_notification_read(p_notification_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; result public.notifications; unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 update public.notifications set read_at=coalesce(read_at,clock_timestamp())
 where id=p_notification_id and recipient_id=actor and audience=actor_role returning * into result;
 if not found then raise exception 'notification_not_found'; end if;
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and read_at is null;
 return jsonb_build_object('item',to_jsonb(result),'unread_count',unread);
end;
$$;
create function public.mark_all_notifications_read()
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); actor_role text; event_time timestamptz:=clock_timestamp(); unread bigint;
begin
 select r.role into actor_role from public.user_roles r where r.user_id=actor;
 if actor is null or actor_role is null then raise exception using errcode='42501',message='notification_account_required'; end if;
 update public.notifications set read_at=event_time where recipient_id=actor and audience=actor_role and read_at is null and created_at<=event_time;
 select count(*) into unread from public.notifications where recipient_id=actor and audience=actor_role and read_at is null;
 return jsonb_build_object('read_at',event_time,'unread_count',unread);
end;
$$;
revoke all on function public.notification_inbox(timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.mark_notification_read(uuid) from public,anon,authenticated;
revoke all on function public.mark_all_notifications_read() from public,anon,authenticated;
grant execute on function public.notification_inbox(timestamptz,uuid),public.mark_notification_read(uuid),public.mark_all_notifications_read() to authenticated;
commit;

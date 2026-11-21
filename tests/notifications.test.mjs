import assert from 'node:assert/strict';
import test from 'node:test';
import { createNotificationService, notificationDestination, notificationErrorMessage, mergeNotificationRefresh } from '../src/services/notifications.ts';
const id = '00000000-0000-0000-0000-000000000010';
const user = '00000000-0000-0000-0000-000000000001';
const booking = '00000000-0000-0000-0000-000000000020';
const item = { id, recipient_id:user, audience:'client', booking_id:booking, kind:'approved', title:'Booking approved', body:'Your ride is approved.', created_at:'2026-11-21T00:00:00Z', read_at:null };
test('inbox uses server-scoped RPC with a stable cursor, never an arbitrary recipient', async () => {
  const calls=[];
  const page={items:[item],unread_count:1234,has_more:false};
  const service=createNotificationService({rpc:async(...args)=>{calls.push(args);return {data:page,error:null};}});
  assert.deepEqual(await service.inbox(),page);
  await service.inbox({created_at:item.created_at,id});
  assert.deepEqual(calls,[['notification_inbox',{p_before_at:null,p_before_id:null}],['notification_inbox',{p_before_at:item.created_at,p_before_id:id}]]);
});
test('empty inbox is valid but missing or malformed data cannot masquerade as no notifications', async () => {
  const good={items:[],unread_count:0,has_more:false};
  assert.deepEqual(await createNotificationService({rpc:async()=>({data:good,error:null})}).inbox(),good);
  for(const data of [null,{}, {...good,items:null},{...good,unread_count:-1},{...good,unread_count:'1'},{...good,has_more:true},{...good,items:[{...item,booking_id:'bad'}]},{...good,items:[{...item,read_at:'bad'}]},{...good,items:[{...item,kind:'custom_url'}]}]) await assert.rejects(createNotificationService({rpc:async()=>({data,error:null})}).inbox());
});
test('mark read confirms the same notification and an authoritative count', async () => {
  const calls=[];const read={...item,read_at:'2026-11-21T01:00:00Z'};
  const service=createNotificationService({rpc:async(...args)=>{calls.push(args);return {data:{item:read,unread_count:7},error:null};}});
  assert.equal((await service.markRead(id)).unread_count,7);
  assert.deepEqual(calls,[['mark_notification_read',{p_notification_id:id}]]);
  await assert.rejects(service.markRead('bad'));
  assert.equal(calls.length,1);
  for(const data of [null,{item,unread_count:0},{item:{...read,id:booking},unread_count:0},{item:read,unread_count:-1}]) await assert.rejects(createNotificationService({rpc:async()=>({data,error:null})}).markRead(id));
});
test('mark all read requires a confirmed server timestamp and count', async () => {
  const good={read_at:'2026-11-21T01:00:00Z',unread_count:0};
  const calls=[];
  assert.deepEqual(await createNotificationService({rpc:async(...args)=>{calls.push(args);return {data:good,error:null};}}).markAllRead(),good);
  assert.deepEqual(calls,[['mark_all_notifications_read']]);
  for(const data of [null,{...good,read_at:null},{...good,unread_count:null}]) await assert.rejects(createNotificationService({rpc:async()=>({data,error:null})}).markAllRead());
});
test('notification destinations always open the current booking, including stale decision alerts', () => {
  assert.deepEqual(notificationDestination(item,'client'),{pathname:'/bookings/[bookingId]',params:{bookingId:booking}});
  assert.deepEqual(notificationDestination({...item,audience:'admin',kind:'new_request'},'admin'),{pathname:'/admin-bookings',params:{view:'all',bookingId:booking}});
  assert.throws(()=>notificationDestination(item,'admin'));
  assert.throws(()=>notificationDestination({...item,booking_id:'https://untrusted.example'},'client'));
});
test('notification errors retain safe retry guidance without leaking diagnostics', () => {
  assert.match(notificationErrorMessage({code:'PGRST202'}),/not enabled/);
  assert.doesNotMatch(notificationErrorMessage(Error('secret internals')),/secret/);
});


test('background refresh preserves loaded history and replaces read-state on overlapping new pages', () => {
  const older={...item,id:booking,created_at:'2026-11-20T00:00:00Z'};
  const next={...item,read_at:'2026-11-21T01:00:00Z'};
  const current=[item,older];
  assert.deepEqual(mergeNotificationRefresh(current,[next]),{items:[next,older],retainedHistory:true});
  assert.equal(current[0].read_at,null);
  assert.deepEqual(mergeNotificationRefresh(current,[]),{items:[],retainedHistory:false});
  assert.deepEqual(mergeNotificationRefresh(current,[{...next,id:user}]),{items:[{...next,id:user}],retainedHistory:false});
});

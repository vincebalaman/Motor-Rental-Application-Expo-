import './register-booking-imports.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
const { bookingSection, bookingStatusText, bookingsInSection } = await import('../src/services/booking-history.ts');
const { createBookingService } = await import('../src/services/bookings.ts');
const today = '2026-11-21';
const booking = (changes = {}) => ({ id: 'b1', status: 'pending', pickup_date: '2026-11-22', return_date: '2026-11-24', created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-20T10:00:00Z', ...changes });
test('upcoming includes pickup today and approved rental dates already underway', () => {
  assert.equal(bookingSection(booking({ pickup_date: today }), today), 'upcoming');
  assert.equal(bookingSection(booking({ status: 'approved', pickup_date: '2026-11-20' }), today), 'upcoming');
});
test('history includes elapsed pending pickups and exclusive approved return day', () => {
  assert.equal(bookingSection(booking({ pickup_date: '2026-11-20' }), today), 'history');
  assert.equal(bookingSection(booking({ status: 'approved', return_date: today }), today), 'history');
  for (const status of ['cancelled','rejected']) assert.equal(bookingSection(booking({ status }), today), 'history');
});
test('past status preserves actual decision and never asserts completion', () => {
  assert.equal(bookingStatusText(booking({ status: 'approved', return_date: today }), today), 'Past · Approved');
  assert.equal(bookingStatusText(booking({ pickup_date: '2026-11-20' }), today), 'Past · Pending approval');
  assert.equal(bookingStatusText(booking({ status: 'cancelled' }), today), 'Cancelled');
  assert.equal(bookingStatusText(booking(), today), 'Pending approval');
});
test('upcoming sorts by pickup, history by latest update, without mutating source', () => {
  const source = [booking({ id: 'later', pickup_date: '2026-11-25' }), booking({ id: 'soon' }), booking({ id: 'old', status: 'rejected' }), booking({ id: 'recent', status: 'cancelled', updated_at: '2026-11-21T01:00:00Z' })];
  assert.deepEqual(bookingsInSection(source, 'upcoming', today).map(row => row.id), ['soon','later']);
  assert.deepEqual(bookingsInSection(source, 'history', today).map(row => row.id), ['recent','old']);
  assert.equal(source[0].id, 'later');
});
test('cancelled request leaves Upcoming immediately', () => {
  const original = booking();
  const cancelled = { ...original, status: 'cancelled' };
  assert.equal(bookingsInSection([original], 'upcoming', today).length, 1);
  assert.equal(bookingsInSection([cancelled], 'upcoming', today).length, 0);
  assert.equal(bookingsInSection([cancelled], 'history', today).length, 1);
});
test('details query scopes both client and booking identity; missing booking stays missing', async () => {
  const calls = [];
  const query = { select: () => query, eq: (...args) => { calls.push(args); return query; }, maybeSingle: async () => ({ data: null, error: null }) };
  const service = createBookingService({ from: table => { assert.equal(table,'bookings'); return query; } });
  assert.equal(await service.get('owner','booking-id'), null);
  assert.deepEqual(calls, [['client_id','owner'], ['id','booking-id']]);
});
test('failed detail read is not presented as an absent booking', async () => {
  const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null, error: new Error('network') }) };
  await assert.rejects(createBookingService({ from: () => query }).get('owner','id'));
});

test('Home prioritizes nearest approved ride over newer pending request', async () => {
  const { homeBooking } = await import('../src/services/booking-history.ts');
  const rows = [booking({ id: 'pending', created_at: '2026-11-21T12:00:00Z' }), booking({ id: 'later', status: 'approved', pickup_date: '2026-11-25', return_date: '2026-11-27' }), booking({ id: 'next', status: 'approved' })];
  assert.equal(homeBooking(rows, today).id, 'next');
});
test('Home keeps approved dates underway until the return day', async () => {
  const { homeBooking } = await import('../src/services/booking-history.ts');
  const active = booking({ id: 'active', status: 'approved', pickup_date: '2026-11-20' });
  assert.equal(homeBooking([booking({ id: 'future', status: 'approved' }), active], today).id, 'active');
  assert.equal(homeBooking([{ ...active, return_date: today }], today), null);
});
test('Home fallback chooses latest eligible pending request independently of list order', async () => {
  const { homeBooking } = await import('../src/services/booking-history.ts');
  const rows = [booking({ id: 'old' }), booking({ id: 'latest', pickup_date: '2026-11-26', created_at: '2026-11-21T12:00:00Z' }), booking({ id: 'expired', pickup_date: '2026-11-20', created_at: '2026-11-21T13:00:00Z' })];
  assert.equal(homeBooking(rows, today).id, 'latest');
});
test('Home excludes cancelled, rejected, elapsed requests and handles an empty account', async () => {
  const { homeBooking } = await import('../src/services/booking-history.ts');
  const rows = [booking({ status: 'rejected' }), booking({ status: 'cancelled' }), booking({ status: 'approved', return_date: today }), booking({ pickup_date: '2026-11-20' })];
  assert.equal(homeBooking(rows, today), null);
  assert.equal(homeBooking([], today), null);
});

test('in-use rentals remain Upcoming and take Home priority even when overdue', async () => {
  const { homeBooking } = await import('../src/services/booking-history.ts');
  const active = booking({ id: 'out', status: 'in_use', pickup_date: '2026-11-18', return_date: '2026-11-20' });
  assert.equal(bookingSection(active, today), 'upcoming');
  assert.equal(bookingStatusText(active, today), 'In use · Overdue');
  assert.equal(homeBooking([booking({ status: 'approved' }), active], today).id, 'out');
});
test('only confirmed completed state goes into completed history, even after early return', () => {
  const completed = booking({ status: 'completed' });
  assert.equal(bookingSection(completed, today), 'history');
  assert.equal(bookingStatusText(completed, today), 'Completed');
  assert.equal(bookingStatusText(booking({ status: 'approved', return_date: today }), today), 'Past · Approved');
});

test('no-show is separate history and never becomes the next ride', async()=>{
  const {homeBooking,canMarkNoShow}=await import('../src/services/booking-history.ts');
  const row=booking({status:'no_show',pickup_date:'2026-11-20'});
  assert.equal(bookingSection(row,today),'history');
  assert.equal(bookingStatusText(row,today),'No-show');
  assert.equal(homeBooking([row],today),null);
  assert.equal(canMarkNoShow(booking({status:'approved',pickup_date:'2026-11-20'}),today),true);
  for(const invalid of [booking({status:'approved',pickup_date:today}),booking({status:'approved'}),booking({status:'in_use',pickup_date:'2026-11-20'}),booking({status:'approved',pickup_date:'2026-11-20',picked_up_at:'time'}),row]) assert.equal(canMarkNoShow(invalid,today),false);
});

test('mixed legacy and timed bookings sort by Philippine pickup instant across UTC date boundaries', () => {
  const records = [booking({ id: 'timed', scheduled_pickup_at: '2026-11-21T16:30:00Z' }), booking({ id: 'legacy' })];
  assert.deepEqual(bookingsInSection(records, 'upcoming', today, Date.parse('2026-11-21T00:00Z')).map(row => row.id), ['legacy','timed']);
});

test('removed history stays out of client history without hiding active rentals', async () => {
  const { canRemoveBookingHistory, homeBooking } = await import('../src/services/booking-history.ts');
  const removed=booking({status:'completed',client_history_hidden_at:'2026-11-21T00:00:00Z'});
  assert.deepEqual(bookingsInSection([removed], 'history', today), []);
  for(const status of ['completed','cancelled','rejected','no_show'])assert.equal(canRemoveBookingHistory(booking({status})),true);
  for(const status of ['pending','approved','in_use'])assert.equal(canRemoveBookingHistory(booking({status})),false);
  const active=booking({status:'in_use',client_history_hidden_at:'2026-11-21T00:00:00Z'});
  assert.equal(bookingsInSection([active], 'upcoming', today).length,1);
  assert.equal(homeBooking([active],today).id,active.id);
});
test('history removal confirms the same owner/reference and server timestamp',async()=>{
 const id='00000000-0000-0000-0000-000000000099';const result={id,client_id:'owner',hidden_at:'2026-11-27T10:00:00Z'};const calls=[];
 const service=createBookingService({rpc:async(...args)=>{calls.push(args);return{data:result,error:null};}});
 assert.deepEqual(await service.hideHistory(id),result);assert.deepEqual(calls,[['hide_booking_history',{p_booking_id:id}]]);
 await assert.rejects(service.hideHistory('bad'));assert.equal(calls.length,1);
 for(const data of [null,{...result,id:'other'},{...result,hidden_at:'bad'},{...result,client_id:null}])await assert.rejects(createBookingService({rpc:async()=>({data,error:null})}).hideHistory(id));
 await assert.rejects(createBookingService({rpc:async()=>({data:null,error:{message:'booking_history_not_closed'}})}).hideHistory(id),/Resolve open bookings first/);
});

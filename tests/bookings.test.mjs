import assert from 'node:assert/strict';
import test from 'node:test';
import { addCalendarDays, bookingErrorMessage, calendarMonthDays, createBookingService, formatCalendarMonth, hasApprovedDateConflict, manilaToday, rentalDays } from '../src/services/bookings.ts';
test('Manila day changes at 16:00 UTC, independently of device timezone', () => {
  assert.equal(manilaToday(new Date('2026-11-20T15:59:59Z')), '2026-11-20');
  assert.equal(manilaToday(new Date('2026-11-20T16:00:00Z')), '2026-11-21');
});
test('rental uses exclusive return date and exact calendar days', () => {
  assert.equal(rentalDays('2028-02-28', '2028-03-01', '2028-02-28'), 2);
  assert.equal(rentalDays('2026-12-31', '2027-01-01', '2026-11-20'), 1);
  assert.equal(rentalDays('2026-11-20', '2027-02-18', '2026-11-20'), 90);
});
test('calendar utilities generate timezone-independent dates and handle exclusive booking boundaries', () => {
  assert.equal(addCalendarDays('2028-02-28', 2), '2028-03-01');
  assert.equal(formatCalendarMonth('2028-02-01'), 'February 2028');
  const february = calendarMonthDays('2028-02-01');
  assert.equal(february[0], null);
  assert.equal(february[1], null);
  assert.equal(february[2], '2028-02-01');
  assert.equal(february.at(-1), '2028-02-29');
  const approved = [{ pickup_date: '2026-12-10', return_date: '2026-12-12' }];
  assert.equal(hasApprovedDateConflict('2026-12-09', '2026-12-10', approved), false);
  assert.equal(hasApprovedDateConflict('2026-12-09', '2026-12-11', approved), true);
  assert.equal(hasApprovedDateConflict('2026-12-12', '2026-12-13', approved), false);
});
test('rejects invalid dates, reversed ranges, past pickup and policy boundaries', () => {
  for (const [start, end] of [['2026-02-30', '2026-03-02'], ['2026-2-03', '2026-03-02'], ['bad','2026-12-01'], ['2026-11-19','2026-11-21'], ['2026-11-20','2026-11-20'], ['2026-11-21','2026-11-20'], ['2026-11-20','2027-02-19'], ['2027-11-21','2027-11-22']]) assert.throws(() => rentalDays(start, end, '2026-11-20'));
});
test('request forwards expected price, never actor status or total', async () => {
  const calls = [];
  const service = createBookingService({ rpc: async (...args) => { calls.push(args); return { data: { id: 'booking' }, error: null }; } });
  const today = manilaToday();
  const end = new Date(Date.parse(today) + 86400000).toISOString().slice(0,10);
  assert.equal((await service.request('motor', today, end, 12345)).id, 'booking');
  assert.deepEqual(calls[0], ['request_motor_booking', { p_motor_id: 'motor', p_pickup_date: today, p_return_date: end, p_expected_rate: 12345 }]);
  await assert.rejects(service.request('motor', today, end, 1.23));
  assert.equal(calls.length, 1);
});
test('cancellation uses guarded RPC rather than direct table writes', async () => {
  const calls = [];
  const service = createBookingService({ rpc: async (...args) => { calls.push(args); return { data: { id: 'booking', status: 'cancelled' }, error: null }; } });
  assert.equal((await service.cancel('booking')).status, 'cancelled');
  assert.deepEqual(calls, [['cancel_motor_booking', { p_booking_id: 'booking' }]]);
});
test('availability calls the redacted approved-dates RPC with a bounded date range', async () => {
  const calls = [];
  const approved = [{ pickup_date: '2026-12-10', return_date: '2026-12-12' }];
  const service = createBookingService({ rpc: async (...args) => { calls.push(args); return { data: approved, error: null }; } });
  assert.deepEqual(await service.approvedAvailability('motor', '2026-12-01', '2027-03-01'), approved);
  assert.deepEqual(calls, [['list_approved_motor_dates', {
    p_motor_id: 'motor', p_from_date: '2026-12-01', p_to_date: '2027-03-01',
  }]]);
  await assert.rejects(service.approvedAvailability('motor', 'bad', '2027-03-01'));
  await assert.rejects(service.approvedAvailability('motor', '2026-12-01', '2028-12-01'));
  assert.equal(calls.length, 1);
});
test('malformed availability responses fail closed', async () => {
  await assert.rejects(
    createBookingService({ rpc: async () => ({ data: [{ pickup_date: '2026-02-30', return_date: '2026-03-02' }], error: null }) })
      .approvedAvailability('motor', '2026-12-01', '2027-03-01'),
  );
  assert.match(bookingErrorMessage({ code: 'PGRST202' }), /latest Supabase migration/);
});
test('list scopes query to client and orders newest first', async () => {
  const calls = [];
  const query = { select: (...args) => { calls.push(['select', ...args]); return query; }, eq: (...args) => { calls.push(['eq', ...args]); return query; }, order: async (...args) => { calls.push(['order', ...args]); return { data: [{ id: 'b' }], error: null }; } };
  const service = createBookingService({ from: name => { calls.push(['from', name]); return query; } });
  assert.deepEqual(await service.list('client'), [{ id: 'b' }]);
  assert.deepEqual(calls.slice(2), [['eq', 'client_id', 'client'], ['order', 'created_at', { ascending: false }]]);
});
test('uncertain mutations never report success, errors provide safe next steps', async () => {
  const service = createBookingService({ rpc: async () => ({ data: null, error: null }) });
  await assert.rejects(service.cancel('id'));
  assert.match(bookingErrorMessage({ message: 'booking_rate_changed' }), /rate changed/);
  assert.match(bookingErrorMessage({ code: 'PGRST202' }), /not enabled/);
  assert.doesNotMatch(bookingErrorMessage({ message: 'password secret' }), /secret/);
});

test('admin listing paginates and joins only referenced client profiles', async () => {
  const calls = [];
  const bookingQuery = {
    select: value => { calls.push(['select', value]); return bookingQuery; },
    order: (...args) => { calls.push(['order', ...args]); return bookingQuery; },
    eq: (...args) => { calls.push(['eq', ...args]); return bookingQuery; },
    range: async (...args) => { calls.push(['range', ...args]); return { data: [{ id: 'b1', client_id: 'client1' }, { id: 'b2', client_id: 'client1' }, { id: 'b3', client_id: 'missing' }], error: null }; },
  };
  const profileQuery = { select: value => { calls.push(['profileSelect', value]); return profileQuery; }, in: async (...args) => { calls.push(['in', ...args]); return { data: [{ id: 'client1', full_name: 'Rider', phone: '123' }], error: null }; } };
  const service = createBookingService({ from: name => name === 'bookings' ? bookingQuery : profileQuery });
  const result = await service.listAdmin('pending', 50);
  assert.deepEqual(calls.find(call => call[0] === 'range'), ['range', 50, 99]);
  assert.deepEqual(calls.find(call => call[0] === 'eq'), ['eq', 'status', 'pending']);
  assert.deepEqual(calls.find(call => call[0] === 'in'), ['in', 'id', ['client1', 'missing']]);
  assert.equal(result.bookings[0].client.full_name, 'Rider');
  assert.equal(result.bookings[2].client, null);
  assert.equal(result.hasMore, false);
});
test('empty admin listing never queries profiles, all filter adds no status predicate', async () => {
  let profileReads = 0;
  const query = { select: () => query, order: () => query, eq: () => { throw new Error('Unexpected status filter'); }, range: async () => ({ data: [], error: null }) };
  const service = createBookingService({ from: name => { if (name !== 'bookings') profileReads++; return query; } });
  assert.deepEqual(await service.listAdmin(null), { bookings: [], hasMore: false });
  assert.equal(profileReads, 0);
});
test('profile lookup failure does not masquerade as missing client details', async () => {
  const query = { select: () => query, order: () => query, range: async () => ({ data: [{ id: 'b1', client_id: 'c' }], error: null }) };
  const profiles = { select: () => profiles, in: async () => ({ data: null, error: new Error('offline') }) };
  await assert.rejects(createBookingService({ from: name => name === 'bookings' ? query : profiles }).listAdmin(null));
});
test('admin decisions use guarded review RPC and verify confirmed status', async () => {
  const calls = [];
  const service = createBookingService({ rpc: async (name, args) => { calls.push([name, args]); return { data: { id: args.p_booking_id, status: args.p_approve ? 'approved' : 'rejected' }, error: null }; } });
  assert.equal((await service.review('b1', true)).status, 'approved');
  assert.equal((await service.review('b2', false)).status, 'rejected');
  assert.deepEqual(calls, [['review_motor_booking', { p_booking_id: 'b1', p_approve: true }], ['review_motor_booking', { p_booking_id: 'b2', p_approve: false }]]);
  await assert.rejects(createBookingService({ rpc: async () => ({ data: { id: 'b1', status: 'pending' }, error: null }) }).review('b1', true));
});
test('admin errors explain conflicts without exposing arbitrary backend text', async () => {
  const { adminBookingErrorMessage } = await import('../src/services/bookings.ts');
  assert.match(adminBookingErrorMessage({ message: 'booking_dates_unavailable' }), /overlapping/);
  assert.match(adminBookingErrorMessage({ message: 'booking_not_pending' }), /already changed/);
  assert.match(adminBookingErrorMessage({ message: 'booking_admin_required' }), /administrator/);
  assert.doesNotMatch(adminBookingErrorMessage(new Error('private internals')), /private internals/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingErrorMessage, createBookingService, manilaToday, rentalDays } from '../src/services/bookings.ts';
test('Manila day changes at 16:00 UTC, independently of device timezone', () => {
  assert.equal(manilaToday(new Date('2026-11-20T15:59:59Z')), '2026-11-20');
  assert.equal(manilaToday(new Date('2026-11-20T16:00:00Z')), '2026-11-21');
});
test('rental uses exclusive return date and exact calendar days', () => {
  assert.equal(rentalDays('2028-02-28', '2028-03-01', '2028-02-28'), 2);
  assert.equal(rentalDays('2026-12-31', '2027-01-01', '2026-11-20'), 1);
  assert.equal(rentalDays('2026-11-20', '2027-02-18', '2026-11-20'), 90);
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

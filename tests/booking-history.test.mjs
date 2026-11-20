import assert from 'node:assert/strict';
import test from 'node:test';
import { bookingSection, bookingStatusText, bookingsInSection } from '../src/services/booking-history.ts';
import { createBookingService } from '../src/services/bookings.ts';
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

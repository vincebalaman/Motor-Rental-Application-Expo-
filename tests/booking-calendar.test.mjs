import './register-booking-imports.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
const { addDays, canSelectCalendarDate, monthCells, rangeIsBlocked, selectCalendarDate, shiftMonth } = await import('../src/services/booking-calendar.ts');
const { createBookingService } = await import('../src/services/bookings.ts');
const today = '2026-11-21';
const empty = { pickup: '', returned: '' };
test('calendar cells align weekdays, month boundaries and leap days', () => {
  const cells = monthCells('2028-02');
  assert.equal(cells[0], null); assert.equal(cells[1], null);
  assert.equal(cells[2], '2028-02-01');
  assert.ok(cells.includes('2028-02-29'));
  assert.equal(cells.length % 7, 0);
  assert.equal(monthCells('2026-02').filter(Boolean).length, 28);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
});
test('selection begins pickup, completes range, then starts over', () => {
  let value = selectCalendarDate(today, empty, [], today);
  assert.deepEqual(value, { pickup: today, returned: '' });
  value = selectCalendarDate('2026-11-24', value, [], today);
  assert.deepEqual(value, { pickup: today, returned: '2026-11-24' });
  value = selectCalendarDate('2026-11-26', value, [], today);
  assert.deepEqual(value, { pickup: '2026-11-26', returned: '' });
  assert.deepEqual(selectCalendarDate('2026-11-25', value, [], today), { pickup: '2026-11-25', returned: '' });
});
test('past and occupied pickup dates are disabled', () => {
  assert.equal(canSelectCalendarDate('2026-11-20', empty, [], today), false);
  assert.equal(canSelectCalendarDate(today, empty, [today], today), false);
  assert.equal(canSelectCalendarDate(addDays(today,365), empty, [], today), true);
  assert.equal(canSelectCalendarDate(addDays(today,366), empty, [], today), false);
});
test('return can meet a reservation boundary but cannot cross unavailable days', () => {
  const value = { pickup: today, returned: '' };
  const blocked = ['2026-11-24', '2026-11-25'];
  assert.equal(canSelectCalendarDate('2026-11-24', value, blocked, today), true);
  assert.equal(canSelectCalendarDate('2026-11-25', value, blocked, today), false);
  assert.equal(canSelectCalendarDate('2026-11-28', value, blocked, today), false);
  assert.equal(rangeIsBlocked(today, '2026-11-24', blocked), false);
  assert.equal(rangeIsBlocked(today, '2026-11-25', blocked), true);
});
test('return respects the 90-day limit across months including furthest pickup', () => {
  const pickup = addDays(today,365);
  const value = { pickup, returned: '' };
  assert.equal(canSelectCalendarDate(addDays(pickup,90), value, [], today), true);
  assert.equal(canSelectCalendarDate(addDays(pickup,91), value, [], today), false);
  assert.equal(addDays('2028-02-28',2), '2028-03-01');
});
test('changed availability invalidates an existing selected range', () => {
  assert.equal(rangeIsBlocked(today, '2026-11-24', ['2026-11-22']), true);
  const value = { pickup: today, returned: '' };
  assert.equal(selectCalendarDate('2026-11-24', value, ['2026-11-22'], today), value);
});
test('availability service forwards motor ID and accepts confirmed empty dates only', async () => {
  let args;
  const service = createBookingService({ rpc: async (...input) => { args = input; return { data: [{ blocked_date: today }], error: null }; } });
  assert.deepEqual(await service.blockedDates('motor'), [today]);
  assert.deepEqual(args, ['motor_blocked_dates', { p_motor_id: 'motor' }]);
  assert.deepEqual(await createBookingService({ rpc: async () => ({ data: [], error: null }) }).blockedDates('motor'), []);
  for (const result of [{ data: null, error: null }, { data: [{}], error: null }, { data: [], error: new Error('offline') }]) {
    await assert.rejects(createBookingService({ rpc: async () => result }).blockedDates('motor'));
  }
});

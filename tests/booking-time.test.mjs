import assert from 'node:assert/strict';
import test from 'node:test';
import { rentalSchedule, completedLateHours, formatRentalTime, scheduleOverlaps, fullyBlockedDays, bookingIsOverdue, bookingScheduleLabel, bookingTimePassed } from '../src/services/booking-time.ts';
const now = Date.parse('2026-11-21T00:00:00Z');
test('agreed pickup uses Philippine time and return uses exact multiples of 24 hours', () => {
  assert.deepEqual(rentalSchedule('2026-11-21','09:30',2,now), { pickup:'2026-11-21T01:30:00.000Z', returned:'2026-11-23T01:30:00.000Z', days:2 });
  assert.equal(rentalSchedule('2026-12-31','23:59',1,now).returned, '2027-01-01T15:59:00.000Z');
  assert.equal(rentalSchedule('2028-02-28','09:00',2,Date.parse('2028-02-28T00:00Z')).returned, '2028-03-01T01:00:00.000Z');
});
test('invalid dates, elapsed times, ambiguous inputs and policy boundaries are rejected', () => {
  for (const [date,time,days] of [['2026-02-30','09:00',1],['2026-11-21','08:00',1],['2026-11-21','07:59',1],['2026-11-21','24:00',1],['2026-11-21','9:00',1],['2026-11-21','09:60',1],['2026-11-22','09:00',0],['2026-11-22','09:00',91],['2026-11-22','09:00',1.5],['2027-11-22','09:00',1]]) assert.throws(() => rentalSchedule(date,time,days,now));
});
test('late charges count only completed hours without rounding', () => {
  const due='2026-11-21T01:00:00Z';
  for(const [returned,hours] of [['2026-11-21T00:00:00Z',0],['2026-11-21T01:59:59Z',0],['2026-11-21T02:00:00Z',1],['2026-11-21T07:10:00Z',6]]) assert.equal(completedLateHours(due,returned),hours);
  assert.equal(completedLateHours(null,now),0);
});
test('adjacent schedules do not overlap and partial-day availability remains selectable', () => {
  const periods=[{blocked_start:'2026-11-21T01:00:00Z',blocked_end:'2026-11-23T01:00:00Z'}];
  assert.equal(scheduleOverlaps('2026-11-23T01:00Z','2026-11-24T01:00Z',periods),false);
  assert.equal(scheduleOverlaps('2026-11-20T01:00Z','2026-11-21T01:00Z',periods),false);
  assert.equal(scheduleOverlaps('2026-11-23T00:59Z','2026-11-24T01:00Z',periods),true);
  assert.deepEqual(fullyBlockedDays(periods,'2026-11-21'),['2026-11-22']);
});
test('overdue and elapsed pickup follow exact instants; legacy retains date-only policy', () => {
  const booking={status:'in_use',pickup_date:'2026-11-20',return_date:'2026-11-21',scheduled_return_at:'2026-11-21T01:00Z'};
  assert.equal(bookingIsOverdue(booking,'2026-11-21',now),false);
  assert.equal(bookingIsOverdue(booking,'2026-11-21',now+3600000),true);
  assert.equal(bookingIsOverdue({...booking,scheduled_return_at:null},'2026-11-21',now),true);
  assert.equal(bookingTimePassed({scheduled_pickup_at:'2026-11-21T01:00Z'},'pickup','2026-11-21',now),false);
  assert.match(bookingScheduleLabel({...booking,scheduled_return_at:null},'return'),/date only/);
  assert.match(formatRentalTime('2026-11-21T01:00Z'),/9:00/);
});

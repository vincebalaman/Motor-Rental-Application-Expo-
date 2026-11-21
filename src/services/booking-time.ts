import type { Booking } from './bookings';
export type BookedPeriod = { blocked_start: string; blocked_end: string };
const DAY = 86400000;
/** All agreed times use Asia/Manila (UTC+08:00), regardless of device timezone. */
export function rentalSchedule(date: string, time: string, days: number, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Choose a pickup date and time.');
  const start = Date.parse(`${date}T${time}:00+08:00`);
  if (!Number.isFinite(start) || new Date(start + 8 * 3600000).toISOString().slice(0, 10) !== date) throw new Error('Choose a valid pickup date.');
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('Choose 1–90 rental days. Each day is 24 hours.');
  if (start <= now) throw new Error('Choose a pickup time in the future, using Philippine time.');
  const today = new Date(now + 8 * 3600000).toISOString().slice(0, 10);
  if (Date.parse(`${date}T00:00:00Z`) > Date.parse(`${today}T00:00:00Z`) + 365 * DAY) throw new Error('Choose a pickup date within the next 365 days.');
  return { pickup: new Date(start).toISOString(), returned: new Date(start + days * DAY).toISOString(), days };
}
export function formatRentalTime(value: string): string {
  return new Date(value).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
export function scheduleOverlaps(pickup: string, returned: string, periods: readonly BookedPeriod[]): boolean {
  return periods.some(period => Date.parse(pickup) < Date.parse(period.blocked_end) && Date.parse(returned) > Date.parse(period.blocked_start));
}
/** Only fully occupied days are disabled; partially available days remain selectable. Server intervals are merged. */
export function fullyBlockedDays(periods: readonly BookedPeriod[], today: string): string[] {
  const start = Date.parse(`${today}T00:00:00+08:00`);
  return Array.from({ length: 366 }, (_, i) => start + i * DAY)
    .filter(day => periods.some(period => Date.parse(period.blocked_start) <= day && Date.parse(period.blocked_end) >= day + DAY))
    .map(day => new Date(day + 8 * 3600000).toISOString().slice(0, 10));
}
export function completedLateHours(due: string | null | undefined, returned: string | number = Date.now()): number {
  return due ? Math.max(0, Math.floor(((typeof returned === 'number' ? returned : Date.parse(returned)) - Date.parse(due)) / 3600000)) : 0;
}
export function bookingIsOverdue(booking: Booking, today: string, now = Date.now()): boolean {
  return booking.status === 'in_use' && (booking.scheduled_return_at ? Date.parse(booking.scheduled_return_at) <= now : booking.return_date <= today);
}
export function bookingTimePassed(booking: Booking, field: 'pickup' | 'return', today: string, now = Date.now()): boolean {
  const exact = field === 'pickup' ? booking.scheduled_pickup_at : booking.scheduled_return_at;
  return exact ? Date.parse(exact) <= now : field === 'pickup' ? booking.pickup_date < today : booking.return_date <= today;
}
export function bookingScheduleLabel(booking: Booking, field: 'pickup' | 'return'): string {
  const exact = field === 'pickup' ? booking.scheduled_pickup_at : booking.scheduled_return_at;
  return exact ? `${formatRentalTime(exact)} PHT` : `${field === 'pickup' ? booking.pickup_date : booking.return_date} (date only)`;
}

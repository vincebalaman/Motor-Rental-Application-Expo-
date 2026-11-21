// Calendar dates are ISO strings, with all arithmetic in UTC to avoid device DST.
export type DateRange = { pickup: string; returned: string };
const DAY = 86400000;
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);
}
export function shiftMonth(month: string, delta: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}
export function monthCells(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00Z`);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= last.getUTCDate(); day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}
export function rangeIsBlocked(pickup: string, returned: string, blocked: readonly string[]): boolean {
  return blocked.some(date => date >= pickup && date < returned);
}
export function canSelectCalendarDate(date: string, range: DateRange, blocked: readonly string[], today: string): boolean {
  if (date < today) return false;
  // A complete range starts over. Tapping before pickup also starts over.
  if (!range.pickup || range.returned || date <= range.pickup) {
    return date <= addDays(today, 365) && !blocked.includes(date);
  }
  // A blocked day can be the return endpoint: it is outside the rental range.
  return date <= addDays(range.pickup, 90) && !rangeIsBlocked(range.pickup, date, blocked);
}
export function selectCalendarDate(date: string, range: DateRange, blocked: readonly string[], today: string): DateRange {
  if (!canSelectCalendarDate(date, range, blocked, today)) return range;
  return !range.pickup || range.returned || date <= range.pickup
    ? { pickup: date, returned: '' } : { pickup: range.pickup, returned: date };
}
export function formatBookingDate(date: string, long = false): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PH', {
    day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC',
  });
}

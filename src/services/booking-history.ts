import { bookingTimePassed, bookingIsOverdue } from './booking-time';
import type { Booking } from './bookings';
export type BookingSection = 'upcoming' | 'history';
export const bookingStatusLabels = { pending: 'Pending approval', approved: 'Approved', in_use: 'In use', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled', no_show: 'No-show' };
export const bookingStatusColors = { pending: '#825510', approved: '#21623c', in_use: '#21484a', completed: '#21623c', rejected: '#991b1b', cancelled: '#687a75', no_show: '#825510' };
export function bookingSection(booking: Booking, today: string, now = Date.now()): BookingSection {
  if (booking.status === 'in_use') return 'upcoming';
  if (booking.status === 'pending') return !bookingTimePassed(booking, 'pickup', today, now) ? 'upcoming' : 'history';
  if (booking.status === 'approved') return !bookingTimePassed(booking, 'return', today, now) ? 'upcoming' : 'history';
  return 'history';
}
export function bookingStatusText(booking: Booking, today: string, now = Date.now()): string {
  if (bookingIsOverdue(booking, today, now)) return 'In use · Overdue';
  const past = (booking.status === 'approved' && bookingTimePassed(booking, 'return', today, now)) || (booking.status === 'pending' && bookingTimePassed(booking, 'pickup', today, now));
  return `${past ? 'Past · ' : ''}${bookingStatusLabels[booking.status]}`;
}
export function bookingsInSection(bookings: Booking[], section: BookingSection, today: string, now = Date.now()): Booking[] {
  return bookings.filter(booking => bookingSection(booking, today, now) === section).sort((a, b) => section === 'upcoming'
    ? Date.parse(a.scheduled_pickup_at ?? `${a.pickup_date}T00:00:00+08:00`) - Date.parse(b.scheduled_pickup_at ?? `${b.pickup_date}T00:00:00+08:00`) || b.created_at.localeCompare(a.created_at)
    : b.updated_at.localeCompare(a.updated_at) || b.created_at.localeCompare(a.created_at));
}
export function homeBooking(bookings: Booking[], today: string, now = Date.now()): Booking | null {
  const upcoming = bookingsInSection(bookings, 'upcoming', today, now);
  // Keep physically active rentals visible, including overdue ones.
  const active = upcoming.find(booking => booking.status === 'in_use');
  if (active) return active;
  const approved = upcoming.find(booking => booking.status === 'approved');
  if (approved) return approved;
  return upcoming.filter(booking => booking.status === 'pending')
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || a.id.localeCompare(b.id))[0] ?? null;
}

export function canMarkNoShow(booking: Booking, today: string, now = Date.now()): boolean {
  return booking.status === 'approved' && !booking.picked_up_at && bookingTimePassed(booking, 'pickup', today, now);
}

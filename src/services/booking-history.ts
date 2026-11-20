import type { Booking } from './bookings';
export type BookingSection = 'upcoming' | 'history';
export const bookingStatusLabels = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
export const bookingStatusColors = { pending: '#825510', approved: '#21623c', rejected: '#991b1b', cancelled: '#687a75' };
export function bookingSection(booking: Booking, today: string): BookingSection {
  if (booking.status === 'pending') return booking.pickup_date >= today ? 'upcoming' : 'history';
  if (booking.status === 'approved') return booking.return_date > today ? 'upcoming' : 'history';
  return 'history';
}
export function bookingStatusText(booking: Booking, today: string): string {
  const past = (booking.status === 'approved' && booking.return_date <= today) || (booking.status === 'pending' && booking.pickup_date < today);
  return `${past ? 'Past · ' : ''}${bookingStatusLabels[booking.status]}`;
}
export function bookingsInSection(bookings: Booking[], section: BookingSection, today: string): Booking[] {
  return bookings.filter(booking => bookingSection(booking, today) === section).sort((a, b) => section === 'upcoming'
    ? a.pickup_date.localeCompare(b.pickup_date) || b.created_at.localeCompare(a.created_at)
    : b.updated_at.localeCompare(a.updated_at) || b.created_at.localeCompare(a.created_at));
}

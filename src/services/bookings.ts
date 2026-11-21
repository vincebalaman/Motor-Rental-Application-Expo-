import { rentalSchedule, type BookedPeriod } from './booking-time';
import type { AdminBookingView } from './admin-dashboard';
import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingStatus = 'pending' | 'approved' | 'in_use' | 'completed' | 'rejected' | 'cancelled' | 'no_show';
export type Booking = {
  id: string; client_id: string; motor_id: string; motor_name: string;
  pickup_date: string; return_date: string; daily_rate_centavos: number; total_centavos: number;
  scheduled_pickup_at?: string | null; scheduled_return_at?: string | null;
  late_hour_rate_centavos?: number; late_hours?: number; late_fee_centavos?: number; final_total_centavos?: number;
  picked_up_at?: string | null; returned_at?: string | null; picked_up_by?: string | null; returned_by?: string | null;
  no_show_at?: string | null; no_show_by?: string | null; no_show_reason?: string | null;
  rejected_at?: string | null; rejected_by?: string | null; rejection_reason?: string | null;
  cancelled_at?: string | null; cancelled_by?: string | null; cancellation_source?: 'client' | 'admin' | null; cancellation_reason?: string | null;
  status: BookingStatus; created_at: string; updated_at: string;
};
export type AdminBooking = Booking & { client: { id: string; full_name: string; phone: string | null } | null };
export const ADMIN_BOOKING_PAGE_SIZE = 50;
export function adminBookingErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const messages: Record<string, string> = {
    booking_no_show_reason_required: 'Enter a no-show reason using 5–500 characters. The client will see this reason.',
    booking_no_show_conflict: 'This booking was already marked No-show with a different reason. Refresh to read the recorded decision.',
    booking_no_show_not_eligible: 'Only an approved booking with no pickup can be marked No-show. Refresh to check its current status.',
    booking_no_show_too_early: 'Wait until after the agreed pickup time (or pickup day for date-only bookings) before marking No-show.',
    booking_rejection_reason_required: 'Enter a rejection reason using 5–500 characters. The client will see this reason.',
    booking_rejection_conflict: 'This request was already rejected with a different reason. Refresh to read the recorded decision.',
    booking_cancellation_reason_required: 'Enter a cancellation reason using 5–500 characters. The client will see this reason.',
    booking_cancellation_conflict: 'This booking was already cancelled with a different reason. Refresh to read the recorded decision.',
    booking_cannot_admin_cancel: 'Only approved bookings that have not been picked up can be cancelled. Refresh to see the current status.',
    booking_invalid_transition: 'This booking has already changed. Refresh the list before recording a handover.',
    booking_pickup_outside_dates: 'Pickup can only be recorded from the agreed pickup time until the scheduled return, using Philippine time.',
    booking_motor_still_out: 'This motor is still with another client. Confirm its return before recording the next pickup.',
    booking_invalid_action: 'This handover action is not supported. Refresh bookings.',
    booking_admin_required: 'Only an administrator can review bookings.',
    booking_dates_unavailable: 'The motor has an overlapping approved or active rental. An overdue motor must be returned before another booking is approved.',
    booking_motor_unavailable: 'This motor is archived or under maintenance and cannot be handed over or approved.',
    booking_invalid_dates: 'Approval failed: the agreed pickup time has already passed in Philippine time.',
    booking_not_pending: 'This request has already changed. Refresh the list to see its current status.',
    booking_not_found: 'This booking could not be found. Refresh the list.',
  };
  return messages[message] ?? 'We could not confirm the action. Refresh bookings to check the current status before trying again.';
}
export class BookingError extends Error {}
export function cancellationReason(value: string): string {
  const reason = value.trim().replace(/\s+/g, ' ');
  if (Array.from(reason).length < 5 || Array.from(reason).length > 500) throw new BookingError('Enter a cancellation reason using 5–500 characters. The client will see this reason.');
  return reason;
}
export function rejectionReason(value: string): string {
  const reason = value.trim().replace(/\s+/g, ' ');
  if (Array.from(reason).length < 5 || Array.from(reason).length > 500) throw new BookingError('Enter a rejection reason using 5–500 characters. The client will see this reason.');
  return reason;
}
export function noShowReason(value: string): string {
  const reason = value.trim().replace(/\s+/g, ' ');
  if (Array.from(reason).length < 5 || Array.from(reason).length > 500) throw new BookingError('Enter a no-show reason using 5–500 characters. The client will see this reason.');
  return reason;
}
const DAY = 86400000;
export function manilaToday(now = new Date()): string {
  return new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
}
function dateValue(value: string): number {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new BookingError('Enter a valid date in YYYY-MM-DD format.');
  }
  return time;
}
export function rentalDays(pickup: string, returned: string, today = manilaToday()): number {
  const start = dateValue(pickup), end = dateValue(returned), current = dateValue(today);
  if (start < current) throw new BookingError('Pickup must be today or later, using Philippine time.');
  if (start > current + 365 * DAY) throw new BookingError('Choose a pickup date within the next 365 days.');
  const days = (end - start) / DAY;
  if (days < 1 || days > 90) throw new BookingError('Return must be after pickup. Rentals can be from 1 to 90 days.');
  return days;
}
export function bookingErrorMessage(error: unknown): string {
  if (error instanceof BookingError) return error.message;
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const messages: Record<string, string> = {
    booking_invalid_times: 'Choose a future pickup time and 1–90 rental days, using Philippine time.',
    booking_time_required: 'Update the app to choose an exact pickup time.',
    booking_invalid_dates: 'Check your dates. Pickup must be within the next 365 days and the rental must be 1–90 days.',
    booking_motor_unavailable: 'This motor is no longer accepting requests. Please choose another motor.',
    booking_rate_changed: 'The daily rate changed. Return to motor details and review the refreshed price before requesting again.',
    booking_dates_unavailable: 'This motor already has an approved booking for those dates. Choose different dates.',
    booking_not_pending: 'This request is no longer pending. Refresh My Bookings to see its current status.',
    booking_not_found: 'This booking could not be found for your account.',
    booking_client_required: 'Log in with a client account to request a booking.',
  };
  if (messages[message]) return messages[message];
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (['42P01', 'PGRST202', 'PGRST205'].includes(String(code))) return 'Bookings are not enabled on the server yet. Please try again after setup is complete.';
  return 'We could not confirm this change. Check My Bookings and refresh before trying again.';
}
export function createBookingService(client: SupabaseClient) {
  return {
    async markNoShow(id: string, reason: string): Promise<Booking> {
      const normalized = noShowReason(reason);
      const { data, error } = await client.rpc('admin_mark_booking_no_show', { p_booking_id: id, p_reason: normalized });
      if (error) throw error;
      if (!data || data.id !== id || data.status !== 'no_show' || data.no_show_reason !== normalized || !data.no_show_at || data.picked_up_at || data.returned_at) throw new BookingError('No-show could not be confirmed. Refresh bookings to check the recorded decision.');
      return data;
    },
    async cancelApproved(id: string, reason: string): Promise<Booking> {
      const normalized = cancellationReason(reason);
      const { data, error } = await client.rpc('admin_cancel_approved_booking', { p_booking_id: id, p_reason: normalized });
      if (error) throw error;
      if (!data || data.id !== id || data.status !== 'cancelled' || data.cancellation_source !== 'admin' || !data.cancelled_at || data.cancellation_reason !== normalized) throw new BookingError('Cancellation could not be confirmed. Refresh bookings to check the recorded decision.');
      return data;
    },
    async handover(id: string, action: 'pickup' | 'return'): Promise<Booking> {
      const { data, error } = await client.rpc('record_motor_handover', { p_booking_id: id, p_action: action });
      if (error) throw error;
      if (!data || data.id !== id || data.status !== (action === 'pickup' ? 'in_use' : 'completed') || !data.picked_up_at || (action === 'return' && !data.returned_at)) throw new BookingError('The handover could not be confirmed. Refresh bookings.');
      return data;
    },
    async get(clientId: string, bookingId: string): Promise<Booking | null> {
      const { data, error } = await client.from('bookings').select('*').eq('client_id', clientId).eq('id', bookingId).maybeSingle();
      if (error) throw error;
      return data;
    },
    async bookedPeriods(motorId: string): Promise<BookedPeriod[]> {
      const { data, error } = await client.rpc('motor_booked_periods', { p_motor_id: motorId });
      if (error) throw error;
      if (!Array.isArray(data) || data.some(row => !Number.isFinite(Date.parse(row.blocked_start)) || !Number.isFinite(Date.parse(row.blocked_end)) || Date.parse(row.blocked_start) >= Date.parse(row.blocked_end))) throw new BookingError('Availability could not be confirmed. Refresh the calendar.');
      return data;
    },
    async blockedDates(motorId: string): Promise<string[]> {
      const { data, error } = await client.rpc('motor_blocked_dates', { p_motor_id: motorId });
      if (error) throw error;
      if (!Array.isArray(data) || data.some(row => typeof row.blocked_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.blocked_date))) {
        throw new BookingError('Availability could not be confirmed. Refresh the calendar.');
      }
      return data.map(row => row.blocked_date);
    },
    async listAdmin(status: AdminBookingView | null, offset = 0, operationsDate = manilaToday(), bookingId?: string): Promise<{ bookings: AdminBooking[]; hasMore: boolean }> {
      let query = client.from('bookings').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (bookingId) query = query.eq('id', bookingId);
      if (status === 'pickups_today') query = query.eq('status', 'approved').eq('pickup_date', operationsDate);
      else if (status === 'returns_today') query = query.eq('status', 'in_use').eq('return_date', operationsDate);
      else if (status === 'overdue') query = query.eq('status', 'in_use').or(`scheduled_return_at.lte.${new Date().toISOString()},and(scheduled_return_at.is.null,return_date.lte.${operationsDate})`);
      else if (status) query = query.eq('status', status);
      const { data, error } = await query.range(offset, offset + ADMIN_BOOKING_PAGE_SIZE - 1);
      if (error) throw error;
      const rows: Booking[] = data ?? [];
      if (!rows.length) return { bookings: [], hasMore: false };
      const { data: profiles, error: profileError } = await client.from('profiles').select('id,full_name,phone').in('id', [...new Set(rows.map(row => row.client_id))]);
      if (profileError) throw profileError;
      const clients = new Map<string, NonNullable<AdminBooking['client']>>((profiles ?? []).map(profile => [profile.id, profile]));
      return { bookings: rows.map(row => ({ ...row, client: clients.get(row.client_id) ?? null })), hasMore: rows.length === ADMIN_BOOKING_PAGE_SIZE };
    },
    async review(id: string, approve: boolean, reason = ''): Promise<Booking> {
      if (!approve) {
        const normalized = rejectionReason(reason);
        const { data, error } = await client.rpc('admin_reject_booking', { p_booking_id: id, p_reason: normalized });
        if (error) throw error;
        if (!data || data.id !== id || data.status !== 'rejected' || data.rejection_reason !== normalized || !data.rejected_at) throw new BookingError('Rejection could not be confirmed. Refresh bookings to check the recorded decision.');
        return data;
      }
      const { data, error } = await client.rpc('review_motor_booking', { p_booking_id: id, p_approve: approve });
      if (error) throw error;
      if (!data?.id || data.id !== id || data.status !== (approve ? 'approved' : 'rejected')) {
        throw new BookingError('The review result could not be confirmed. Refresh bookings.');
      }
      return data;
    },
    async list(clientId: string): Promise<Booking[]> {
      const { data, error } = await client.from('bookings').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    async request(motorId: string, pickup: string, days: number, rateCentavos: number): Promise<Booking> {
      const instant = Date.parse(pickup);
      if (!Number.isFinite(instant) || instant % 60000 !== 0) throw new BookingError('Choose a valid pickup time, to the minute.');
      const local = new Date(instant + 8 * 3600000).toISOString();
      try { rentalSchedule(local.slice(0, 10), local.slice(11, 16), days); } catch (cause) { throw new BookingError((cause as Error).message); }
      if (!Number.isSafeInteger(rateCentavos) || rateCentavos < 1 || rateCentavos > 100000000) throw new BookingError('Refresh the motor details to review its daily rate.');
      const { data, error } = await client.rpc('request_timed_motor_booking', { p_motor_id: motorId, p_pickup_at: pickup, p_rental_days: days, p_expected_rate: rateCentavos });
      if (error) throw error;
      if (!data?.id) throw new BookingError('We could not confirm the request. Check My Bookings before trying again.');
      return data;
    },
    async cancel(id: string): Promise<Booking> {
      const { data, error } = await client.rpc('cancel_motor_booking', { p_booking_id: id });
      if (error) throw error;
      if (!data?.id) throw new BookingError('We could not confirm cancellation. Refresh My Bookings.');
      return data;
    },
  };
}

import type { SupabaseClient } from '@supabase/supabase-js';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type Booking = {
  id: string; client_id: string; motor_id: string; motor_name: string;
  pickup_date: string; return_date: string; daily_rate_centavos: number; total_centavos: number;
  status: BookingStatus; created_at: string; updated_at: string;
};
export type AdminBooking = Booking & { client: { id: string; full_name: string; phone: string | null } | null };
export const ADMIN_BOOKING_PAGE_SIZE = 50;
export function adminBookingErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  const messages: Record<string, string> = {
    booking_admin_required: 'Only an administrator can review bookings.',
    booking_dates_unavailable: 'Approval failed: this motor already has an approved booking for overlapping dates. You can reject this request instead.',
    booking_motor_unavailable: 'Approval failed: this motor is archived or under maintenance.',
    booking_invalid_dates: 'Approval failed: the pickup date has already passed in Philippine time.',
    booking_not_pending: 'This request has already changed. Refresh the list to see its current status.',
    booking_not_found: 'This booking could not be found. Refresh the list.',
  };
  return messages[message] ?? 'We could not confirm the action. Refresh bookings to check the current status before trying again.';
}
export class BookingError extends Error {}
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
    async listAdmin(status: BookingStatus | null, offset = 0): Promise<{ bookings: AdminBooking[]; hasMore: boolean }> {
      let query = client.from('bookings').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query.range(offset, offset + ADMIN_BOOKING_PAGE_SIZE - 1);
      if (error) throw error;
      const rows: Booking[] = data ?? [];
      if (!rows.length) return { bookings: [], hasMore: false };
      const { data: profiles, error: profileError } = await client.from('profiles').select('id,full_name,phone').in('id', [...new Set(rows.map(row => row.client_id))]);
      if (profileError) throw profileError;
      const clients = new Map<string, NonNullable<AdminBooking['client']>>((profiles ?? []).map(profile => [profile.id, profile]));
      return { bookings: rows.map(row => ({ ...row, client: clients.get(row.client_id) ?? null })), hasMore: rows.length === ADMIN_BOOKING_PAGE_SIZE };
    },
    async review(id: string, approve: boolean): Promise<Booking> {
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
    async request(motorId: string, pickup: string, returned: string, rateCentavos: number): Promise<Booking> {
      rentalDays(pickup, returned);
      if (!Number.isSafeInteger(rateCentavos) || rateCentavos < 1 || rateCentavos > 100000000) throw new BookingError('Refresh the motor details to review its daily rate.');
      const { data, error } = await client.rpc('request_motor_booking', { p_motor_id: motorId, p_pickup_date: pickup, p_return_date: returned, p_expected_rate: rateCentavos });
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

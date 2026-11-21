import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingStatus } from './bookings';
export type AdminBookingView = BookingStatus | 'pickups_today' | 'returns_today' | 'overdue';
export const adminViewLabels: Record<AdminBookingView, string> = { pending: 'Pending', pickups_today: 'Pickups today', returns_today: 'Returns today', in_use: 'In use', overdue: 'Overdue', approved: 'Approved', completed: 'Completed', rejected: 'Rejected', cancelled: 'Cancelled', no_show: 'No-show' };
export function parseAdminView(value: unknown): AdminBookingView | null {
  return value === 'all' ? null : typeof value === 'string' && Object.hasOwn(adminViewLabels,value) ? value as AdminBookingView : 'pending';
}
export function parseDashboardDate(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value ? value : undefined;
}
export type AdminSummary = { today: string; pending: number; pickups_today: number; returns_today: number; in_use: number; overdue: number };
export function createAdminDashboardService(client: SupabaseClient) {
  return { async summary(): Promise<AdminSummary> {
    const { data, error } = await client.rpc('admin_booking_summary');
    if (error) throw error;
    const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
    if (!row || !parseDashboardDate(row.today) || ['pending','pickups_today','returns_today','in_use','overdue'].some(key => !Number.isSafeInteger(row[key]) || row[key]<0)) throw new Error('Invalid dashboard summary');
    return row;
  } };
}

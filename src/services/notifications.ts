import type { SupabaseClient } from '@supabase/supabase-js';
export type NotificationKind = 'new_request' | 'approved' | 'rejected' | 'cancelled' | 'in_use' | 'completed' | 'no_show' | 'pickup_reminder' | 'return_reminder' | 'overdue';
export type AppNotification = { id: string; recipient_id: string; audience: 'client' | 'admin'; booking_id: string; kind: NotificationKind; title: string; body: string; created_at: string; read_at: string | null };
export type NotificationCursor = { created_at: string; id: string };
export type InboxPage = { items: AppNotification[]; unread_count: number; has_more: boolean };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const kinds: NotificationKind[] = ['new_request','approved','rejected','cancelled','in_use','completed','no_show','pickup_reminder','return_reminder','overdue'];
function timestamp(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)); }
function count(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0; }
function validNotification(value: unknown): value is AppNotification {
  if (!value || typeof value !== 'object') return false;
  const n = value as AppNotification;
  return [n.id,n.recipient_id,n.booking_id].every(id => typeof id === 'string' && UUID.test(id))
    && ['client','admin'].includes(n.audience) && kinds.includes(n.kind) && typeof n.title === 'string' && !!n.title && typeof n.body === 'string' && !!n.body
    && timestamp(n.created_at) && (n.read_at === null || timestamp(n.read_at));
}
export function notificationErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['PGRST202','PGRST205','42P01'].includes(code)) return 'Notifications are not enabled on the server yet. Please try again after setup is complete.';
  return 'We could not update your notifications. Check your connection and try again.';
}
/** Destinations are derived from trusted IDs and the current role, never a stored URL. */
export function notificationDestination(notification: AppNotification, role: 'client' | 'admin') {
  if (!UUID.test(notification.booking_id) || notification.audience !== role) throw new Error('Notification unavailable for this account.');
  return role === 'admin'
    ? { pathname: '/admin-bookings' as const, params: { view: 'all', bookingId: notification.booking_id } }
    : { pathname: '/bookings/[bookingId]' as const, params: { bookingId: notification.booking_id } };
}
export function createNotificationService(client: SupabaseClient) {
  return {
    async inbox(cursor?: NotificationCursor): Promise<InboxPage> {
      const { data, error } = await client.rpc('notification_inbox', { p_before_at: cursor?.created_at ?? null, p_before_id: cursor?.id ?? null });
      if (error) throw error;
      if (!data || !Array.isArray(data.items) || data.items.length > 50 || !data.items.every(validNotification) || !count(data.unread_count) || typeof data.has_more !== 'boolean' || (data.has_more && data.items.length !== 50)) throw new Error('Invalid notification inbox.');
      return data;
    },
    async markRead(id: string): Promise<{ item: AppNotification; unread_count: number }> {
      if (!UUID.test(id)) throw new Error('Invalid notification.');
      const { data, error } = await client.rpc('mark_notification_read', { p_notification_id: id });
      if (error) throw error;
      if (!data || !validNotification(data.item) || data.item.id !== id || !data.item.read_at || !count(data.unread_count)) throw new Error('Read status could not be confirmed.');
      return data;
    },
    async markAllRead(): Promise<{ read_at: string; unread_count: number }> {
      const { data, error } = await client.rpc('mark_all_notifications_read');
      if (error) throw error;
      if (!data || !timestamp(data.read_at) || !count(data.unread_count)) throw new Error('Read status could not be confirmed.');
      return data;
    },
  };
}

/** Keep loaded older pages during background refresh, but reset if arrivals create a gap. */
export function mergeNotificationRefresh(current: AppNotification[], latest: AppNotification[]): { items: AppNotification[]; retainedHistory: boolean } {
  if (!latest.length || !current.some(item => latest.some(next => next.id === item.id))) return { items: latest, retainedHistory: false };
  const ids = new Set(latest.map(item => item.id));
  const oldest = latest[latest.length - 1];
  const older = current.filter(item => !ids.has(item.id) && (Date.parse(item.created_at) < Date.parse(oldest.created_at) || (Date.parse(item.created_at) === Date.parse(oldest.created_at) && item.id < oldest.id)));
  return { items: [...latest,...older], retainedHistory: older.length > 0 };
}

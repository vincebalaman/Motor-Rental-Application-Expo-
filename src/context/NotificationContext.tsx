import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type AppNotification, type NotificationCursor, createNotificationService, mergeNotificationRefresh, notificationErrorMessage } from '@/services/notifications';

type Value = { items: AppNotification[]; unread: number; loading: boolean; loadingMore: boolean; hasMore: boolean; error: string | null; refreshing: boolean; mutating: boolean; refresh: () => Promise<void>; loadMore: () => Promise<void>; markRead: (id: string) => Promise<void>; remove: (id: string) => Promise<void>; markAllRead: () => Promise<void> };
const Context = createContext<Value | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const service = useMemo(() => userId ? createNotificationService(getSupabaseClient()) : null, [userId]);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const active = useRef(false);
  const version = useRef(0);
  const fetching = useRef(false);
  const changing = useRef(false);
  const currentItems = useRef<AppNotification[]>([]);
  const invalidate = useCallback(() => { version.current++; }, []);
  const cursor = useRef<NotificationCursor | undefined>(undefined);
  const canLoadMore = useRef(false);
  const load = useCallback(async (more = false, preserveHistory = false) => {
    if (!service || !active.current || changing.current || (more && (fetching.current || !canLoadMore.current))) return;
    const request = ++version.current;
    fetching.current = true;
    if (more) setLoadingMore(true); else { setLoading(true); setLoadingMore(false); }
    setError(null);
    try {
      const page = await service.inbox(more ? cursor.current : undefined);
      if (page.items.some(item => item.recipient_id !== userId || item.audience !== role)) throw new Error('Account changed.');
      if (!active.current || request !== version.current) return;
      const merged = more
        ? { items: [...currentItems.current,...page.items.filter(item => !currentItems.current.some(old => old.id === item.id))], retainedHistory: false }
        : preserveHistory ? mergeNotificationRefresh(currentItems.current,page.items) : { items: page.items, retainedHistory: false };
      currentItems.current = merged.items; setItems(merged.items); setUnread(page.unread_count);
      if (!merged.retainedHistory) {
        setHasMore(page.has_more); canLoadMore.current = page.has_more;
        const last = page.items.at(-1);
        cursor.current = last ? { id: last.id, created_at: last.created_at } : undefined;
      }
    } catch (cause) {
      if (active.current && request === version.current) setError(notificationErrorMessage(cause));
    } finally {
      if (active.current && request === version.current) { fetching.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [role, service, userId]);
  const refresh = useCallback(() => load(false), [load]);
  const loadMore = useCallback(() => load(true), [load]);
  useEffect(() => {
    active.current = true;
    // Do not await notifications during session restoration or login.
    const initial = setTimeout(() => { void refresh(); }, 0);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(false,true); });
    const timer = setInterval(() => { if (AppState.currentState === 'active' && !fetching.current) void load(false,true); }, 30000);
    return () => { active.current = false; invalidate(); clearTimeout(initial); clearInterval(timer); subscription.remove(); };
  }, [refresh, load, invalidate]);
  const markRead = useCallback(async (id: string) => {
    if (!service || !active.current || changing.current) throw new Error('Wait for the current notification action.');
    changing.current = true; setMutating(true); version.current++; fetching.current = false; setLoading(false); setLoadingMore(false); setError(null);
    try {
      const result = await service.markRead(id);
      if (result.item.recipient_id !== userId || result.item.audience !== role) throw new Error('Account changed.');
      if (active.current) { currentItems.current = currentItems.current.map(item => item.id === id ? result.item : item); setItems(currentItems.current); setUnread(result.unread_count); }
    } catch (cause) { if (active.current) setError(notificationErrorMessage(cause)); throw cause; }
    finally { changing.current = false; if (active.current) setMutating(false); }
  }, [role, service, userId]);
  const remove = useCallback(async (id: string) => {
    if (!service || !active.current || changing.current) throw new Error('Wait for the current notification action.');
    changing.current = true; setMutating(true); version.current++; fetching.current = false; setLoading(false); setLoadingMore(false); setError(null);
    try {
      const result = await service.remove(id);
      if (result.recipient_id !== userId || result.audience !== role) throw new Error('Account changed.');
      if (active.current) { currentItems.current = currentItems.current.filter(item => item.id !== result.id); setItems(currentItems.current); setUnread(result.unread_count); }
    } catch (cause) { if (active.current) setError(notificationErrorMessage(cause)); throw cause; }
    finally { changing.current = false; if (active.current) setMutating(false); }
  }, [role, service, userId]);
  const markAllRead = useCallback(async () => {
    if (!service || !active.current || changing.current) return;
    changing.current = true; setMutating(true); version.current++; fetching.current = false; setLoading(false); setLoadingMore(false); setError(null);
    try {
      const result = await service.markAllRead();
      if (active.current) {
        currentItems.current = currentItems.current.map(item => !item.read_at && Date.parse(item.created_at) <= Date.parse(result.read_at) ? { ...item, read_at: result.read_at } : item); setItems(currentItems.current);
        setUnread(result.unread_count);
      }
    } catch (cause) { if (active.current) setError(notificationErrorMessage(cause)); throw cause; }
    finally { changing.current = false; if (active.current) setMutating(false); }
  }, [service]);
  return <Context.Provider value={{ items, unread, loading, loadingMore, refreshing: loading, hasMore, error, mutating, refresh, loadMore, markRead, remove, markAllRead }}>{children}</Context.Provider>;
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('useNotifications requires NotificationProvider');
  return value;
}

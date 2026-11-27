import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type Booking, bookingErrorMessage, createBookingService } from '@/services/bookings';

type Value = { bookings: Booking[]; loading: boolean; error: string | null; refresh: () => void; request: (motorId: string, pickup: string, days: number, rate: number) => Promise<Booking>; hideHistory: (id: string) => Promise<void>; cancel: (id: string) => Promise<Booking> };
const Context = createContext<Value | null>(null);
export function BookingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const refresh = useCallback(() => {
    if (!user || user.role !== 'client') return;
    const request = ++revision.current;
    setLoading(true); setError(null);
    void service.list(user.id).then(rows => {
      if (active.current && request === revision.current) setBookings(rows);
    }).catch(cause => {
      if (active.current && request === revision.current) setError(bookingErrorMessage(cause));
    }).finally(() => { if (active.current && request === revision.current) setLoading(false); });
  }, [service, user]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  const merge = (booking: Booking) => {
    if (!active.current) return;
    revision.current++; setLoading(false); setError(null);
    setBookings(rows => [booking, ...rows.filter(row => row.id !== booking.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  };
  const request = async (motorId: string, pickup: string, days: number, rate: number) => {
    if (user?.role !== 'client') throw new Error('booking_client_required');
    const result = await service.request(motorId, pickup, days, rate); merge(result); return result;
  };
  const cancel = async (id: string) => { const result = await service.cancel(id); merge(result); return result; };
  const hideHistory = async (id: string) => {
    if (user?.role !== 'client') throw new Error('booking_client_required');
    revision.current++; setLoading(false);
    const result = await service.hideHistory(id);
    if (result.client_id !== user.id) throw new Error('booking_client_required');
    if (!active.current) return;
    revision.current++; setLoading(false); setError(null);
    setBookings(rows => rows.map(row => row.id === result.id ? { ...row, client_history_hidden_at: result.hidden_at } : row));
  };
  return <Context.Provider value={{ bookings, loading, error, refresh, request, cancel, hideHistory }}>{children}</Context.Provider>;
}
export function useBookings() {
  const value = useContext(Context);
  if (!value) throw new Error('useBookings requires BookingProvider');
  return value;
}

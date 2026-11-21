import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dailyPrice } from '@/components/catalog-card';
import BookingStatusBadge from '@/components/booking-status';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type AdminBooking, adminBookingErrorMessage, createBookingService, manilaToday } from '@/services/bookings';

import { type AdminBookingView, adminViewLabels as labels, parseAdminView, parseDashboardDate } from '@/services/admin-dashboard';
import { formatBookingDate } from '@/services/booking-calendar';

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  const { view, date } = useLocalSearchParams<{ view?: string; date?: string }>();
  const initialView = parseAdminView(view);
  const operationsDate = parseDashboardDate(date) ?? manilaToday();
  if (user?.role !== 'admin') return <Redirect href="/dashboard" />;
  return <AdminBookings key={`${user.id}:${initialView}:${operationsDate}`} initialView={initialView} operationsDate={operationsDate} />;
}

function AdminBookings({ initialView, operationsDate }: { initialView: AdminBookingView | null; operationsDate: string }) {
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [filter, setFilter] = useState<AdminBookingView | null>(initialView);
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; approve?: boolean; handover?: 'pickup' | 'return' } | null>(null);
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const focused = useRef(false);
  const running = useRef(false);
  const fetching = useRef(false);
  const offset = useRef(0);

  const load = useCallback(async (more = false) => {
    if (!focused.current || (more && fetching.current)) return;
    const request = ++revision.current;
    const start = more ? offset.current : 0;
    fetching.current = true;
    setLoadError(null);
    if (more) setLoadingMore(true);
    else { setLoading(true); setLoadingMore(false); }
    try {
      const result = await service.listAdmin(filter, start, operationsDate);
      if (!focused.current || request !== revision.current) return;
      setRows(current => more ? [...current, ...result.bookings.filter(row => !current.some(old => old.id === row.id))] : result.bookings);
      offset.current = start + result.bookings.length;
      setHasMore(result.hasMore);
    } catch {
      if (focused.current && request === revision.current) setLoadError('We could not load bookings and client details. Check your connection and refresh.');
    } finally {
      if (focused.current && request === revision.current) { fetching.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [filter, service, operationsDate]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [load]));

  const selectFilter = (value: AdminBookingView | null) => {
    if (running.current || value === filter) return;
    revision.current++; offset.current = 0;
    setRows([]); setHasMore(false); setConfirmation(null); setActionError(null); setNotice(null); setLoading(true); setFilter(value); router.setParams({ view: value ?? 'all', date: operationsDate });
  };
  const review = async () => {
    if (!confirmation || running.current) return;
    const { id, approve, handover } = confirmation;
    running.current = true; setBusy(true); setActionError(null); setNotice(null);
    try {
      const booking = handover ? await service.handover(id, handover) : await service.review(id, approve === true);
      if (focused.current) setNotice(`${handover ? handover === 'pickup' ? 'Pickup recorded' : 'Return recorded' : approve ? 'Approved' : 'Rejected'}: ${booking.motor_name}.`);
    } catch (cause) {
      if (focused.current) setActionError(adminBookingErrorMessage(cause));
    } finally {
      running.current = false; setBusy(false); setConfirmation(null);
      // Recheck server state even after a timeout or another admin's decision.
      void load();
    }
  };

  return <MainSafe>
    <FlatList
      data={rows} keyExtractor={item => item.id} refreshing={loading} onRefresh={() => { void load(); }} contentContainerStyle={styles.page}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={styles.eyebrow}>ADMIN WORKSPACE</Text>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.copy}>Review requests, record handovers, and track motors still out with clients.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['pending', 'pickups_today', 'returns_today', 'in_use', 'overdue', 'approved', 'completed', 'rejected', 'cancelled', null] as const).map(value => <Pressable key={value ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: filter === value, disabled: busy }} disabled={busy} onPress={() => selectFilter(value)} style={[styles.chip, filter === value && styles.selected]}><Text style={[styles.chipText, filter === value && styles.selectedText]}>{value ? operationsDate !== manilaToday() && value === 'pickups_today' ? 'Pickups by date' : operationsDate !== manilaToday() && value === 'returns_today' ? 'Returns by date' : labels[value] : 'All'}</Text></Pressable>)}
        </ScrollView>
        {(filter === 'pickups_today' || filter === 'returns_today' || filter === 'overdue') && <Text style={styles.copy}>Operations date: {formatBookingDate(operationsDate)} (Philippine time){filter === 'overdue' ? '. Includes motors due on this date that are still out.' : ''}</Text>}
        {loadError && <View style={styles.message}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><SubmitButton title="RETRY LOADING" onPress={() => { void load(); }} /></View>}
        {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
        {notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !loadError ? <View style={styles.card}><Text style={styles.heading}>No bookings to show</Text><Text style={styles.copy}>Pull down to check for new requests.</Text></View> : undefined}
      renderItem={({ item }) => {
        const expired = item.pickup_date < manilaToday();
        return <View style={styles.card}>
          <BookingStatusBadge booking={item} today={manilaToday()} />
          <Text style={styles.heading}>{item.motor_name}</Text>
          <View style={styles.client}><Text style={styles.label}>CLIENT</Text><Text style={styles.clientName}>{item.client?.full_name ?? 'Client profile unavailable'}</Text><Text style={styles.copy}>{item.client?.phone ? `Phone: ${item.client.phone}` : 'No phone number provided'}</Text><Text selectable style={styles.reference}>Client ID: {item.client_id}</Text></View>
          <Text style={styles.copy}>Pickup: {item.pickup_date}{'\n'}Return: {item.return_date} (not charged)</Text>
          <Text style={styles.copy}>{(Date.parse(item.return_date) - Date.parse(item.pickup_date)) / 86400000} days × {dailyPrice(item.daily_rate_centavos / 100)} / day</Text>
          <Text style={styles.total}>{dailyPrice(item.total_centavos / 100)}</Text>
          <Text style={styles.copy}>Requested: {new Date(item.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>
          <Text selectable style={styles.reference}>Reference: {item.id}</Text>
          {!!item.picked_up_at && <Text style={styles.copy}>Picked up: {new Date(item.picked_up_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}
          {!!item.returned_at && <Text style={styles.copy}>Returned: {new Date(item.returned_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}
          {item.status === 'in_use' && item.return_date <= manilaToday() && <Text style={styles.error}>Overdue: this motor is still out. Record its actual return before handing it to another client.</Text>}
          {(item.status === 'approved' || item.status === 'in_use') && <View style={styles.confirmation}>
            {confirmation?.id === item.id && confirmation.handover ? <>
              <Text style={styles.heading}>{confirmation.handover === 'pickup' ? 'Confirm motor handover?' : 'Confirm motor returned?'}</Text>
              <Text style={styles.copy}>{confirmation.handover === 'pickup' ? 'Confirm only after the client has received this motor. The pickup time will be recorded.' : 'Confirm only after the motor is physically back with the rental shop. This completes the rental. The original total stays unchanged; fees and refunds are not calculated here.'}</Text>
              <SubmitButton title={confirmation.handover === 'pickup' ? 'CONFIRM PICKUP' : 'CONFIRM RETURN'} onPress={() => { void review(); }} isSubmitting={busy} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmation(null)} style={styles.action}><Text style={styles.chipText}>Go back</Text></Pressable>
            </> : item.status === 'in_use' || (item.pickup_date <= manilaToday() && item.return_date > manilaToday()) ? <SubmitButton title={item.status === 'in_use' ? 'RECORD RETURN' : 'RECORD PICKUP'} onPress={() => { if (!running.current) { setConfirmation({ id: item.id, handover: item.status === 'in_use' ? 'return' : 'pickup' }); setActionError(null); setNotice(null); } }} isSubmitting={busy} /> : <Text style={styles.copy}>{item.pickup_date > manilaToday() ? 'Pickup can be recorded when the approved rental dates begin.' : 'These approved dates have passed without a recorded pickup. This is not a completed rental.'}</Text>}
          </View>}
          {item.status === 'pending' && <>
            {expired && <Text style={styles.error}>Pickup date has passed. This request can be rejected, but cannot be approved.</Text>}
            {confirmation?.id === item.id ? <View style={styles.confirmation}>
              <Text style={styles.heading}>{confirmation.approve ? 'Approve this booking?' : 'Reject this request?'}</Text>
              <Text style={styles.copy}>{confirmation.approve ? 'This reserves the motor for these dates. Availability will be checked again when you confirm.' : 'The client will see Rejected in My Bookings. This decision cannot be undone in the app.'}</Text>
              <SubmitButton title={confirmation.approve ? 'CONFIRM APPROVAL' : 'CONFIRM REJECTION'} onPress={() => { void review(); }} isSubmitting={busy} style={!confirmation.approve ? styles.reject : undefined} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmation(null)} style={styles.action}><Text style={styles.chipText}>Keep pending</Text></Pressable>
            </View> : <View style={styles.actions}>
              {!expired && <Pressable accessibilityRole="button" accessibilityLabel={`Approve booking for ${item.motor_name}`} disabled={busy} style={[styles.action, styles.approve]} onPress={() => { setConfirmation({ id: item.id, approve: true }); setActionError(null); setNotice(null); }}><Text style={styles.selectedText}>Approve</Text></Pressable>}
              <Pressable accessibilityRole="button" accessibilityLabel={`Reject booking for ${item.motor_name}`} disabled={busy} style={[styles.action, styles.rejectOutline]} onPress={() => { setConfirmation({ id: item.id, approve: false }); setActionError(null); setNotice(null); }}><Text style={styles.error}>Reject</Text></Pressable>
            </View>}
          </>}
        </View>;
      }}
      ListFooterComponent={hasMore ? <View style={styles.footer}><SubmitButton title="LOAD MORE BOOKINGS" onPress={() => { if (!running.current) void load(true); }} isSubmitting={loadingMore || loading} /></View> : undefined}
    />
  </MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 22, gap: 18, paddingBottom: 32, maxWidth: 850, width: '100%', alignSelf: 'center' }, header: { gap: 14 },
  eyebrow: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#183334', fontSize: 32, fontWeight: '800' },
  copy: { color: '#687a75', fontSize: 14, lineHeight: 22 }, filters: { gap: 10 }, chip: { padding: 14, borderRadius: 24, backgroundColor: '#e6eadd' }, chipText: { color: '#21484a', fontWeight: '700' }, selected: { backgroundColor: '#21484a' }, selectedText: { color: '#faf8f2', fontWeight: '700' },
  message: { gap: 10 }, error: { color: '#991b1b', lineHeight: 22 }, success: { color: '#21623c', lineHeight: 22, fontWeight: '700' },
  card: { padding: 22, gap: 12, backgroundColor: '#faf8f2', borderRadius: 22, borderWidth: 1, borderColor: '#e1e2d9' }, status: { fontWeight: '800', fontSize: 13 }, heading: { color: '#21484a', fontSize: 21, fontWeight: '800' },
  client: { padding: 15, gap: 5, borderRadius: 12, backgroundColor: '#edf0e7' }, label: { color: '#687a75', fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, clientName: { color: '#183334', fontSize: 16, fontWeight: '700' }, reference: { color: '#687a75', fontSize: 11 }, total: { color: '#21484a', fontSize: 24, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' }, action: { padding: 15, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, approve: { backgroundColor: '#21484a', flexGrow: 1 }, reject: { backgroundColor: '#8c3730' }, rejectOutline: { borderWidth: 1, borderColor: '#b37168', flexGrow: 1 }, confirmation: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderColor: '#dddcd3' }, footer: { paddingVertical: 12 },
});

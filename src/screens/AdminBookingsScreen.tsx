import { Redirect, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { dailyPrice } from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type AdminBooking, type BookingStatus, adminBookingErrorMessage, createBookingService, manilaToday } from '@/services/bookings';

const labels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
const colors = { pending: '#825510', approved: '#21623c', rejected: '#991b1b', cancelled: '#687a75' };

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Redirect href="/dashboard" />;
  return <AdminBookings key={user.id} />;
}

function AdminBookings() {
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [filter, setFilter] = useState<BookingStatus | null>('pending');
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; approve: boolean } | null>(null);
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
      const result = await service.listAdmin(filter, start);
      if (!focused.current || request !== revision.current) return;
      setRows(current => more ? [...current, ...result.bookings.filter(row => !current.some(old => old.id === row.id))] : result.bookings);
      offset.current = start + result.bookings.length;
      setHasMore(result.hasMore);
    } catch {
      if (focused.current && request === revision.current) setLoadError('We could not load bookings and client details. Check your connection and refresh.');
    } finally {
      if (focused.current && request === revision.current) { fetching.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [filter, service]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [load]));

  const selectFilter = (value: BookingStatus | null) => {
    if (running.current || value === filter) return;
    revision.current++; offset.current = 0;
    setRows([]); setHasMore(false); setConfirmation(null); setActionError(null); setNotice(null); setLoading(true); setFilter(value);
  };
  const review = async () => {
    if (!confirmation || running.current) return;
    const { id, approve } = confirmation;
    running.current = true; setBusy(true); setActionError(null); setNotice(null);
    try {
      const booking = await service.review(id, approve);
      if (focused.current) setNotice(`${approve ? 'Approved' : 'Rejected'}: ${booking.motor_name}.`);
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
        <Text style={styles.copy}>Review client requests. Only approved bookings reserve a motor.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['pending', 'approved', 'rejected', 'cancelled', null] as const).map(value => <Pressable key={value ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: filter === value, disabled: busy }} disabled={busy} onPress={() => selectFilter(value)} style={[styles.chip, filter === value && styles.selected]}><Text style={[styles.chipText, filter === value && styles.selectedText]}>{value ? labels[value] : 'All'}</Text></Pressable>)}
        </ScrollView>
        {loadError && <View style={styles.message}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><SubmitButton title="RETRY LOADING" onPress={() => { void load(); }} /></View>}
        {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
        {notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !loadError ? <View style={styles.card}><Text style={styles.heading}>No {filter ? labels[filter].toLowerCase() + ' ' : ''}bookings</Text><Text style={styles.copy}>Pull down to check for new requests.</Text></View> : undefined}
      renderItem={({ item }) => {
        const expired = item.pickup_date < manilaToday();
        return <View style={styles.card}>
          <Text style={[styles.status, { color: colors[item.status] }]}>{labels[item.status]}</Text>
          <Text style={styles.heading}>{item.motor_name}</Text>
          <View style={styles.client}><Text style={styles.label}>CLIENT</Text><Text style={styles.clientName}>{item.client?.full_name ?? 'Client profile unavailable'}</Text><Text style={styles.copy}>{item.client?.phone ? `Phone: ${item.client.phone}` : 'No phone number provided'}</Text><Text selectable style={styles.reference}>Client ID: {item.client_id}</Text></View>
          <Text style={styles.copy}>Pickup: {item.pickup_date}{'\n'}Return: {item.return_date} (not charged)</Text>
          <Text style={styles.copy}>{(Date.parse(item.return_date) - Date.parse(item.pickup_date)) / 86400000} days × {dailyPrice(item.daily_rate_centavos / 100)} / day</Text>
          <Text style={styles.total}>{dailyPrice(item.total_centavos / 100)}</Text>
          <Text style={styles.copy}>Requested: {new Date(item.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>
          <Text selectable style={styles.reference}>Reference: {item.id}</Text>
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

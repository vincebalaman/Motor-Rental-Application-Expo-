import BookingPayment from '@/components/booking-payment';
import { useBookingClock } from '@/hooks/use-booking-clock';
import BookingCharges from '@/components/booking-charges';
import { bookingScheduleLabel, bookingIsOverdue, bookingTimePassed } from '@/services/booking-time';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { dailyPrice } from '@/components/catalog-card';
import BookingStatusBadge from '@/components/booking-status';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type AdminBooking, adminBookingErrorMessage, cancellationReason, rejectionReason, noShowReason, createBookingService, manilaToday } from '@/services/bookings';

import { type AdminBookingView, adminViewLabels as labels, parseAdminView, parseDashboardDate } from '@/services/admin-dashboard';
import { canMarkNoShow } from '@/services/booking-history';
import { formatBookingDate } from '@/services/booking-calendar';

function BookingAction({ title, onPress, isSubmitting = false, style, secondary = false }: {
  title: string; onPress: () => void; isSubmitting?: boolean; style?: StyleProp<ViewStyle>; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }} disabled={isSubmitting} onPress={onPress} style={({ pressed }) => [styles.primaryButton, secondary && styles.outlineButton, style, pressed && styles.pressed, isSubmitting && styles.disabled]}>
    {isSubmitting ? <ActivityIndicator color={secondary ? '#21484a' : '#fff'} /> : <Text style={[styles.primaryText, secondary && styles.outlineText]}>{title}</Text>}
  </Pressable>;
}

export default function AdminBookingsScreen() {
  const { user } = useAuth();
  const { view, date, bookingId } = useLocalSearchParams<{ view?: string; date?: string; bookingId?: string }>();
  const targetBookingId = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId) ? bookingId : undefined;
  const initialView = parseAdminView(view);
  const operationsDate = parseDashboardDate(date) ?? manilaToday();
  if (user?.role !== 'admin') return <Redirect href="/dashboard" />;
  return <AdminBookings key={`${user.id}:${initialView}:${operationsDate}:${targetBookingId ?? 'all'}`} initialView={targetBookingId ? null : initialView} operationsDate={operationsDate} targetBookingId={targetBookingId} />;
}

function AdminBookings({ initialView, operationsDate, targetBookingId }: { initialView: AdminBookingView | null; operationsDate: string; targetBookingId?: string }) {
  const clock = useBookingClock();
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [filter, setFilter] = useState<AdminBookingView | null>(initialView);
  const [rows, setRows] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; approve?: boolean; handover?: 'pickup' | 'return'; cancel?: boolean; noShow?: boolean } | null>(null);
  const [recordId, setRecordId] = useState<string | null>(targetBookingId ?? null);
  const [reason, setReason] = useState('');
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
      const result = await service.listAdmin(filter, start, operationsDate, targetBookingId);
      if (!focused.current || request !== revision.current) return;
      setRows(current => more ? [...current, ...result.bookings.filter(row => !current.some(old => old.id === row.id))] : result.bookings);
      if (!more) setConfirmation(current => current && (((current.cancel || current.noShow) && !result.bookings.some(row => row.id === current.id && row.status === 'approved')) || (current.approve === false && !result.bookings.some(row => row.id === current.id && row.status === 'pending'))) ? null : current);
      offset.current = start + result.bookings.length;
      setHasMore(result.hasMore);
    } catch {
      if (focused.current && request === revision.current) setLoadError('We could not load bookings and client details. Check your connection and refresh.');
    } finally {
      if (focused.current && request === revision.current) { fetching.current = false; setLoading(false); setLoadingMore(false); }
    }
  }, [filter, service, operationsDate, targetBookingId]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [load]));

  const selectFilter = (value: AdminBookingView | null) => {
    if (running.current || (value === filter && !targetBookingId)) return;
    revision.current++; offset.current = 0;
    setRows([]); setHasMore(false); setConfirmation(null); setActionError(null); setNotice(null); setLoading(true); setFilter(value); router.setParams({ view: value ?? 'all', date: operationsDate, bookingId: undefined });
  };
  const review = async () => {
    if (!confirmation || running.current) return;
    const { id, approve, handover, cancel, noShow } = confirmation;
    if (noShow) { try { noShowReason(reason); } catch { setActionError('Enter a no-show reason using 5–500 characters. The client will see this reason.'); return; } }
    if (cancel) { try { cancellationReason(reason); } catch { setActionError('Enter a cancellation reason using 5–500 characters. The client will see this reason.'); return; } }
    const rejecting = !noShow && !cancel && !handover && approve === false;
    if (rejecting) { try { rejectionReason(reason); } catch { setActionError('Enter a rejection reason using 5–500 characters. The client will see this reason.'); return; } }
    let reasonActionFailed = false;
    running.current = true; setBusy(true); setActionError(null); setNotice(null);
    try {
      const booking = noShow ? await service.markNoShow(id, reason) : cancel ? await service.cancelApproved(id, reason) : handover ? await service.handover(id, handover) : await service.review(id, approve === true, reason);
      if (focused.current) setNotice(`${noShow ? 'No-show recorded' : cancel ? 'Booking cancelled' : handover ? handover === 'pickup' ? 'Pickup recorded' : 'Return recorded' : approve ? 'Approved' : 'Rejected'}: ${booking.motor_name}.`);
    } catch (cause) {
      reasonActionFailed = !!cancel || !!noShow || rejecting;
      if (focused.current) setActionError(adminBookingErrorMessage(cause));
    } finally {
      running.current = false; setBusy(false); if (!reasonActionFailed) setConfirmation(null);
      // Recheck server state even after a timeout or another admin's decision.
      void load();
    }
  };

  return <MainSafe>
    <FlatList
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets data={rows} keyExtractor={item => item.id} refreshing={loading} onRefresh={() => { void load(); }} contentContainerStyle={styles.page}
      ListHeaderComponent={<View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>Bookings</Text>
        <Text style={styles.copy}>{targetBookingId ? 'Booking opened from your notifications.' : 'Review requests and manage active rentals.'}</Text>
        {targetBookingId && <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/admin-bookings', params: { view: 'all' } })} style={styles.recordButton}><Text style={styles.link}>View all bookings →</Text></Pressable>}
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['pending', 'pickups_today', 'returns_today', 'in_use', 'overdue', 'approved', 'completed', 'rejected', 'cancelled', 'no_show', null] as const).map(value => <Pressable key={value ?? 'all'} accessibilityRole="button" accessibilityState={{ selected: filter === value, disabled: busy }} disabled={busy} onPress={() => selectFilter(value)} style={[styles.chip, filter === value && styles.selected]}><Text style={[styles.chipText, filter === value && styles.selectedText]}>{value ? operationsDate !== manilaToday() && value === 'pickups_today' ? 'Pickups by date' : operationsDate !== manilaToday() && value === 'returns_today' ? 'Returns by date' : labels[value] : 'All'}</Text></Pressable>)}
        </ScrollView>
        {(filter === 'pickups_today' || filter === 'returns_today' || filter === 'overdue') && <Text style={styles.copy}>Operations date: {formatBookingDate(operationsDate)} (Philippine time){filter === 'overdue' ? '. Overdue rentals are still out past their scheduled return.' : ''}</Text>}
        {loadError && <View style={styles.message}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><BookingAction title="Try again" secondary onPress={() => { void load(); }} /></View>}
        {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
        {notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
      </View>}
      ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !loadError ? <View style={styles.card}><Text style={styles.heading}>No bookings to show</Text><Text style={styles.copy}>{targetBookingId ? 'This booking is no longer available. Open all bookings to check the latest records.' : 'Pull down to check for new requests.'}</Text></View> : undefined}
      renderItem={({ item }) => {
        const expired = bookingTimePassed(item, 'pickup', manilaToday(), clock);
        return <View style={styles.card}>
          <BookingStatusBadge booking={item} today={manilaToday()} now={clock} />
          <Text style={styles.motorName}>{item.motor_name}</Text>
          <View style={styles.client}><Text style={styles.label}>Client</Text><Text style={styles.clientName}>{item.client?.full_name ?? 'Client profile unavailable'}</Text><Text selectable style={styles.copy}>{item.client?.phone ? `Phone: ${item.client.phone}` : 'No phone number provided'}</Text></View>
          <View style={styles.section}>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Rental schedule</Text><Text style={styles.caption}>Philippine time</Text></View>
            <View>
              <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.pickupMarker} /><View style={styles.timeline} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Pickup</Text><Text style={styles.scheduleValue}>{bookingScheduleLabel(item, 'pickup')}</Text></View></View>
              <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.returnMarker} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Return by</Text><Text style={styles.scheduleValue}>{bookingScheduleLabel(item, 'return')}</Text></View></View>
            </View>
            {!!item.picked_up_at && <Text style={styles.caption}>Pickup recorded: {new Date(item.picked_up_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</Text>}
            {!!item.returned_at && <Text style={styles.caption}>Return recorded: {new Date(item.returned_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</Text>}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental charges</Text>
            <Text style={styles.caption}>{(Date.parse(item.return_date) - Date.parse(item.pickup_date)) / 86400000} days × {dailyPrice(item.daily_rate_centavos / 100)} / day</Text>
            <BookingCharges booking={item} now={clock} minimal />
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Booking reference and records for ${item.motor_name}`} accessibilityState={{ expanded: recordId === item.id }} onPress={() => setRecordId(current => current === item.id ? null : item.id)} style={styles.recordButton}><Text style={styles.link}>Booking reference & records</Text><Text accessible={false} style={styles.link}>{recordId === item.id ? '−' : '+'}</Text></Pressable>
          {recordId === item.id && <View style={styles.recordPanel}><BookingPayment booking={item} admin /><Text style={styles.label}>Booking reference</Text><Text selectable style={styles.reference}>{item.id}</Text><Text style={styles.label}>Client ID</Text><Text selectable style={styles.reference}>{item.client_id}</Text><Text style={styles.caption}>Requested {new Date(item.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</Text></View>}
          {item.status === 'no_show' && <View style={styles.confirmation}><Text style={styles.heading}>No-show record</Text><Text style={styles.copy}>{item.no_show_reason}</Text>{!!item.no_show_at && <Text style={styles.copy}>{new Date(item.no_show_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}</View>}
          {item.status === 'rejected'  && <View style={styles.confirmation}><Text style={styles.heading}>Rejection reason</Text><Text style={styles.copy}>{item.rejection_reason || 'No reason recorded for this older request.'}</Text>{!!item.rejected_at && <Text style={styles.copy}>{new Date(item.rejected_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}</View>}
          {item.cancellation_source && <View style={styles.confirmation}><Text style={styles.heading}>{item.cancellation_source === 'admin' ? 'Cancelled by rental shop' : 'Cancelled by client'}</Text>{!!item.cancellation_reason && <Text style={styles.copy}>{item.cancellation_reason}</Text>}{!!item.cancelled_at && <Text style={styles.copy}>{new Date(item.cancelled_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}</View>}
          {bookingIsOverdue(item, manilaToday(), clock) && <Text style={styles.error}>Overdue: this motor is still out. Record its actual return before handing it to another client.</Text>}
          {(item.status === 'approved' || item.status === 'in_use') && !(confirmation?.id === item.id && (confirmation.cancel || confirmation.noShow)) && <View style={styles.confirmation}>
            {confirmation?.id === item.id && confirmation.handover ? <>
              <Text style={styles.heading}>{confirmation.handover === 'pickup' ? 'Confirm motor handover?' : 'Confirm motor returned?'}</Text>
              <Text style={styles.copy}>{confirmation.handover === 'pickup' ? 'Confirm only after the client has received this motor. The pickup time will be recorded.' : 'Confirm only after the motor is physically back with the rental shop. This completes the rental. The server records the actual return time and finalizes any completed-hour late charge.'}</Text>
              {confirmation.handover === 'return' && <BookingCharges booking={item} returnPreview now={clock} minimal />}
              <BookingAction title={confirmation.handover === 'pickup' ? 'Confirm pickup' : 'Confirm return'} onPress={() => { void review(); }} isSubmitting={busy} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmation(null)} style={styles.action}><Text style={styles.chipText}>Go back</Text></Pressable>
            </> : item.status === 'in_use' || ((item.scheduled_pickup_at ? Date.parse(item.scheduled_pickup_at) <= clock : item.pickup_date <= manilaToday()) && !bookingTimePassed(item, 'return', manilaToday(), clock)) ? <BookingAction title={item.status === 'in_use' ? 'Record return' : 'Record pickup'} onPress={() => { if (!running.current) { setConfirmation({ id: item.id, handover: item.status === 'in_use' ? 'return' : 'pickup' }); setActionError(null); setNotice(null); } }} isSubmitting={busy} /> : <Text style={styles.copy}>{(item.scheduled_pickup_at ? Date.parse(item.scheduled_pickup_at) > clock : item.pickup_date > manilaToday()) ? 'Pickup can be recorded from the agreed pickup time.' : 'The scheduled return has passed without a recorded pickup. This is not a completed rental.'}</Text>}
          </View>}
          {item.status === 'pending' && <>
            {expired && <Text style={styles.error}>Scheduled pickup has passed. This request can be rejected, but cannot be approved.</Text>}
            {confirmation?.id === item.id ? <View style={styles.confirmation}>
              <Text style={styles.heading}>{confirmation.approve ? 'Approve this booking?' : 'Reject this request?'}</Text>
              <Text style={styles.copy}>{confirmation.approve ? 'This reserves the motor for these dates. Availability will be checked again when you confirm.' : 'The client will see Rejected in My Bookings. This decision cannot be undone in the app.'}</Text>
              {!confirmation.approve && <>
                <TextInput accessibilityLabel="Rejection reason, visible to client" placeholder="Explain why this request is being declined" placeholderTextColor="#85907e" multiline underlineColorAndroid="transparent" textAlignVertical="top" maxLength={500} value={reason} onChangeText={setReason} editable={!busy} style={styles.reasonInput} />
                <Text style={styles.copy}>{Array.from(reason).length}/500 characters · Minimum 5 · Visible to client</Text>
                {actionError && <Text style={styles.error}>{actionError}</Text>}
              </>}
              <BookingAction title={confirmation.approve ? 'Confirm approval' : 'Confirm rejection'} onPress={() => { void review(); }} isSubmitting={busy} style={!confirmation.approve ? styles.reject : undefined} />
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirmation(null)} style={styles.action}><Text style={styles.chipText}>Keep pending</Text></Pressable>
            </View> : <View style={styles.actions}>
              {!expired && <Pressable accessibilityRole="button" accessibilityLabel={`Approve booking for ${item.motor_name}`} disabled={busy} style={[styles.action, styles.approve]} onPress={() => { setConfirmation({ id: item.id, approve: true }); setActionError(null); setNotice(null); }}><Text style={styles.selectedText}>Approve</Text></Pressable>}
              <Pressable accessibilityRole="button" accessibilityLabel={`Reject booking for ${item.motor_name}`} disabled={busy} style={[styles.action, styles.rejectOutline]} onPress={() => { setReason(''); setConfirmation({ id: item.id, approve: false }); setActionError(null); setNotice(null); }}><Text style={styles.error}>Reject</Text></Pressable>
            </View>}
          </>}
          {item.status === 'approved' && <View style={styles.secondarySection}><Text style={styles.caption}>Other actions</Text>
          {canMarkNoShow(item, manilaToday(), clock) && <View style={confirmation?.id === item.id && confirmation.noShow ? styles.confirmation : styles.secondaryActions}>
            {confirmation?.id === item.id && confirmation.noShow ? <>
              <Text style={styles.heading}>Mark client as a no-show?</Text><Text style={styles.copy}>Confirm that the client did not collect the motor. This closes the booking and releases its reserved dates. The client can read your reason. Fees and refunds are not processed.</Text>
              <TextInput accessibilityLabel="No-show reason, visible to client" placeholder="Explain the missed pickup" placeholderTextColor="#85907e" multiline underlineColorAndroid="transparent" textAlignVertical="top" maxLength={500} value={reason} onChangeText={setReason} editable={!busy} style={styles.reasonInput} />
              <Text style={styles.copy}>{Array.from(reason).length}/500 characters · Minimum 5</Text>{actionError && <Text style={styles.error}>{actionError}</Text>}
              <BookingAction title="Confirm no-show" onPress={() => { void review(); }} isSubmitting={busy} style={styles.reject} />
              <Pressable accessibilityRole="button" disabled={busy} style={styles.action} onPress={() => { setConfirmation(null); setActionError(null); }}><Text style={styles.chipText}>Keep approved booking</Text></Pressable>
            </> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.action, styles.rejectOutline]} onPress={() => { setReason(''); setConfirmation({ id: item.id, noShow: true }); setActionError(null); setNotice(null); }}><Text style={styles.error}>Mark no-show</Text></Pressable>}
          </View>}
          {item.status === 'approved' && confirmation?.id === item.id && confirmation.cancel && <View style={styles.confirmation}>
            <Text style={styles.heading}>Cancel this approved booking?</Text>
            <Text style={styles.copy}>This releases the reserved dates and cannot be undone in the app. The client will see your reason. The original total is retained; no payment or refund is processed.</Text>
            <TextInput accessibilityLabel="Cancellation reason, visible to client" placeholder="Explain why this booking is being cancelled" placeholderTextColor="#85907e" multiline underlineColorAndroid="transparent" textAlignVertical="top" maxLength={500} value={reason} onChangeText={setReason} editable={!busy} style={styles.reasonInput} />
            <Text style={styles.copy}>{Array.from(reason).length}/500 characters · Minimum 5</Text>
            {actionError && <Text style={styles.error}>{actionError}</Text>}
            <BookingAction title="Confirm cancellation" onPress={() => { void review(); }} isSubmitting={busy} style={styles.reject} />
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setConfirmation(null); setActionError(null); }} style={styles.action}><Text style={styles.chipText}>Keep approved booking</Text></Pressable>
          </View>}
          {item.status === 'approved' && !(confirmation?.id === item.id && (confirmation.cancel || confirmation.noShow)) && <Pressable accessibilityRole="button" disabled={busy} style={[styles.action, styles.rejectOutline]} onPress={() => { setReason(''); setConfirmation({ id: item.id, cancel: true }); setActionError(null); setNotice(null); }}><Text style={styles.error}>Cancel approved booking</Text></Pressable>}
          </View>}
        </View>;
      }}
      ListFooterComponent={hasMore ? <View style={styles.footer}><BookingAction title="Load more bookings" secondary onPress={() => { if (!running.current) void load(true); }} isSubmitting={loadingMore || loading} /></View> : undefined}
    />
  </MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 20, gap: 20, paddingBottom: 32, maxWidth: 850, width: '100%', alignSelf: 'center' }, header: { gap: 14 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, caption: { color: '#65736e', fontSize: 12, lineHeight: 19 }, filters: { gap: 8 }, chip: { minHeight: 44, justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e5de', borderRadius: 11, backgroundColor: '#fff' }, chipText: { color: '#21484a', fontWeight: '600', fontSize: 13 }, selected: { backgroundColor: '#21484a', borderColor: '#21484a' }, selectedText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  message: { gap: 12, padding: 16, backgroundColor: '#fff7f3', borderWidth: 1, borderColor: '#e7cec1', borderRadius: 14 }, error: { color: '#9b3d29', fontSize: 13, lineHeight: 21 }, success: { color: '#285940', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  card: { padding: 20, gap: 14, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de' }, motorName: { color: '#1d2928', fontSize: 22, fontWeight: '600', letterSpacing: -0.4 }, heading: { color: '#273b37', fontSize: 17, fontWeight: '600' }, section: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderColor: '#edf0e9' }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, sectionTitle: { color: '#273b37', fontSize: 14, fontWeight: '600' },
  client: { padding: 14, gap: 5, borderRadius: 12, backgroundColor: '#f2f5ef' }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 }, clientName: { color: '#273b37', fontSize: 16, fontWeight: '600' }, reference: { color: '#526663', fontSize: 12, lineHeight: 19 },
  scheduleRow: { flexDirection: 'row', gap: 12 }, markerColumn: { width: 12, alignItems: 'center', paddingTop: 5 }, pickupMarker: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#21484a', backgroundColor: '#fff' }, returnMarker: { width: 9, height: 9, borderRadius: 2, backgroundColor: '#21484a' }, timeline: { width: 1, flex: 1, minHeight: 30, backgroundColor: '#dce3dc', marginVertical: 5 }, scheduleCopy: { flex: 1, gap: 3, paddingBottom: 12 }, scheduleValue: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  recordButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10 }, link: { color: '#21484a', fontSize: 13, fontWeight: '500' }, recordPanel: { padding: 14, backgroundColor: '#f5f7f2', borderRadius: 12, gap: 6 },
  actions: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', paddingTop: 16, borderTopWidth: 1, borderColor: '#edf0e9' }, action: { paddingVertical: 12, paddingHorizontal: 16, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, approve: { backgroundColor: '#21484a', flexGrow: 1 }, reject: { backgroundColor: '#8c3730' }, rejectOutline: { backgroundColor: '#fff', flexGrow: 0, alignSelf: 'flex-start' }, confirmation: { gap: 12, padding: 16, borderWidth: 1, borderColor: '#dce4dd', borderRadius: 14, backgroundColor: '#f8faf6' }, secondaryActions: { alignItems: 'flex-start' }, secondarySection: { gap: 8, paddingTop: 14, borderTopWidth: 1, borderColor: '#edf0e9' }, reasonInput: { backgroundColor: '#fff', color: '#273b37', borderWidth: 1, borderColor: '#dce4dd', borderRadius: 12, padding: 14, minHeight: 110, fontSize: 14 },
  primaryButton: { minHeight: 52, padding: 16, borderRadius: 13, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' }, outlineButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce4dd' }, outlineText: { color: '#21484a' }, pressed: { opacity: 0.7 }, disabled: { opacity: 0.4 }, footer: { paddingVertical: 8 },
});

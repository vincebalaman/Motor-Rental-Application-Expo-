import BookingPayment from '@/components/booking-payment';
import { useBookingClock } from '@/hooks/use-booking-clock';
import BookingCharges from '@/components/booking-charges';
import { bookingScheduleLabel, bookingTimePassed, bookingIsOverdue } from '@/services/booking-time';
import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import BookingStatus from '@/components/booking-status';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type Booking, bookingErrorMessage, createBookingService, manilaToday } from '@/services/bookings';

export default function BookingDetailsRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  return <BookingDetails key={`${user.id}:${bookingId}`} clientId={user.id} bookingId={bookingId} />;
}
function BookingDetails({ clientId, bookingId }: { clientId: string; bookingId: string }) {
  const clock = useBookingClock();
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const { cancel } = useBookings();
  const { motors } = useMotorInventory();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const generation = useRef(0);
  const focused = useRef(false);
  const running = useRef(false);
  const load = useCallback(async () => {
    if (!focused.current) return;
    const version = ++generation.current;
    setLoading(true); setVerified(false); setLoadError(null);
    try {
      const result = typeof bookingId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId) ? await service.get(clientId, bookingId) : null;
      if (focused.current && version === generation.current) { setBooking(result); setVerified(true); }
    } catch {
      if (focused.current && version === generation.current) setLoadError('We could not refresh this booking. Check your connection and try again.');
    } finally {
      if (focused.current && version === generation.current) setLoading(false);
    }
  }, [bookingId, clientId, service]);
  useFocusEffect(useCallback(() => {
    focused.current = true; void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [load]));
  const cancelRequest = async () => {
    if (!booking || booking.status !== 'pending' || !verified || running.current) return;
    running.current = true; setBusy(true); setActionError(null); setNotice(null);
    try {
      const result = await cancel(booking.id);
      if (focused.current) { setBooking(result); setNotice('Your request was cancelled.'); }
    } catch (cause) {
      if (focused.current) setActionError(bookingErrorMessage(cause));
    } finally {
      running.current = false; setBusy(false); setConfirming(false); void load();
    }
  };
  const today = manilaToday(new Date(clock));
  const motor = motors.find(item => item.id === booking?.motor_id);
  const elapsed = booking && (bookingTimePassed(booking, booking.status === 'approved' ? 'return' : 'pickup', today, clock));
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void load(); }} tintColor="#21484a" />}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.replace('/bookings')} style={styles.linkButton}><Text style={styles.link}>← My bookings</Text></Pressable>
    <Text accessibilityRole="header" style={styles.title}>Booking details</Text>
    {loadError && <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><Pressable accessibilityRole="button" onPress={() => { void load(); }} style={styles.outlineButton}><Text style={styles.link}>Try again</Text></Pressable></View>}
    {loading && !booking && <ActivityIndicator color="#21484a" accessibilityLabel="Loading booking details" />}
    {notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
    {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    {booking ? <>
      <View style={styles.panel}>
        <View style={styles.motorHeader}>
          <View style={styles.photo}>{motor?.imageUrl ? <Image source={{ uri: motor.imageUrl }} contentFit="cover" style={StyleSheet.absoluteFill} accessibilityLabel={`${booking.motor_name} photo`} /> : <Text style={styles.photoInitial}>{booking.motor_name.charAt(0)}</Text>}</View>
          <View style={styles.motorCopy}><BookingStatus booking={booking} today={today} now={clock} /><Text style={styles.motorName}>{booking.motor_name}</Text></View>
        </View>
        <Text style={styles.copy}>{booking.status === 'pending' ? elapsed ? 'The scheduled pickup has passed. This request still awaits an admin decision; you can cancel it while it is pending.' : 'Awaiting admin approval. Your motor is not reserved yet.' : booking.status === 'approved' ? elapsed ? 'The scheduled rental period has passed. This does not confirm pickup or return.' : 'Your request is approved for the schedule below.' : booking.status === 'in_use' ? bookingIsOverdue(booking, today, clock) ? 'The motor is still recorded as in use and is overdue. Contact the rental shop to arrange its return.' : 'Pickup has been recorded by the rental shop. Please return the motor by the scheduled return time.' : booking.status === 'completed' ? 'The rental shop has confirmed the motor was returned. This rental is completed.' : booking.status === 'no_show' ? 'The rental shop recorded that this motor was not collected. The booking is closed as No-show; it is not a completed rental.' : booking.status === 'rejected' ? 'The admin declined this request. You can explore other motors or dates.' : 'This request was cancelled and does not reserve a motor.'}</Text>
      </View>
      {booking.status === 'no_show' && <View style={styles.panel}><Text style={styles.heading}>Missed pickup</Text><Text style={styles.copy}>{booking.no_show_reason}</Text>{!!booking.no_show_at && <Text style={styles.copy}>Recorded {new Date(booking.no_show_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}<Text style={styles.copy}>The rental shop has closed this booking and released its dates. The original total is retained for reference. No-show does not automatically collect a fee or issue a refund. Check the payment section for any amount already received.</Text></View>}
      {booking.status === 'rejected' && <View style={styles.panel}><Text style={styles.heading}>Why your request was declined</Text><Text style={styles.copy}>{booking.rejection_reason || 'No reason was recorded for this older request. Contact the rental shop if you need more details.'}</Text>{!!booking.rejected_at && <Text style={styles.copy}>Rejected {new Date(booking.rejected_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}</View>}
      {booking.status === 'cancelled' && (booking.cancellation_source || booking.cancellation_reason) && <View style={styles.panel}><Text style={styles.heading}>{booking.cancellation_source === 'admin' ? 'Cancelled by the rental shop' : 'Cancelled by you'}</Text>{!!booking.cancellation_reason && <Text style={styles.copy}>{booking.cancellation_reason}</Text>}{!!booking.cancelled_at && <Text style={styles.copy}>Cancelled {new Date(booking.cancelled_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}<Text style={styles.copy}>These dates are no longer reserved by this booking. The original total is shown for reference; no refund or payment is processed here.</Text></View>}
      <View style={styles.panel}>
        <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.heading}>Rental schedule</Text><Text style={styles.caption}>Philippine time</Text></View>
        <View>
          <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.pickupMarker} /><View style={styles.timeline} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Pickup</Text><Text style={styles.value}>{bookingScheduleLabel(booking, 'pickup')}</Text></View></View>
          <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.returnMarker} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Return by</Text><Text style={styles.value}>{bookingScheduleLabel(booking, 'return')}</Text></View></View>
        </View>
        <Text style={styles.caption}>{booking.scheduled_pickup_at ? 'Each day is 24 hours. A late pickup does not change your return time.' : 'No exact pickup time was recorded for this older booking.'}</Text>
      </View>
      <View style={styles.panel}><Text style={styles.heading}>Price breakdown</Text><Text style={styles.copy}>{(Date.parse(booking.return_date) - Date.parse(booking.pickup_date)) / 86400000} rental days × {dailyPrice(booking.daily_rate_centavos / 100)} / day</Text><BookingCharges booking={booking} now={clock} minimal /><Text style={styles.copy}>Your base rental rate is fixed at the time of booking.</Text></View>
      {!!booking.picked_up_at && <View style={styles.panel}><Text style={styles.heading}>Handover record</Text><View style={styles.recordRow}><Text style={styles.label}>Picked up</Text><Text style={styles.recordValue}>{new Date(booking.picked_up_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</Text></View>{!!booking.returned_at && <View style={styles.recordRow}><Text style={styles.label}>Returned</Text><Text style={styles.recordValue}>{new Date(booking.returned_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT</Text></View>}<Text style={styles.copy}>Confirmed by the rental shop.</Text></View>}
      <View style={styles.panel}><Text style={styles.heading}>Booking reference</Text><View style={styles.referenceBox}><Text selectable style={styles.reference}>{booking.id}</Text></View><Text style={styles.copy}>Requested {new Date(booking.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text><Text style={styles.copy}>Last updated {new Date(booking.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text></View>
      <BookingPayment booking={booking} />
      {booking.status === 'pending' && <View style={styles.panel}>{confirming ? <>
        <Text style={styles.heading}>Cancel this request?</Text><Text style={styles.copy}>The admin will no longer be able to approve it. You can submit a new request later.</Text>
        <Pressable accessibilityRole="button" disabled={busy || !verified} accessibilityState={{ disabled: busy || !verified, busy }} onPress={() => { void cancelRequest(); }} style={[styles.cancelButton, (busy || !verified) && styles.disabled]}>{busy ? <ActivityIndicator color="#faf8f2" /> : <Text style={styles.cancelText}>Confirm cancellation</Text>}</Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(false)} style={styles.linkButton}><Text style={styles.link}>Keep request</Text></Pressable>
      </> : <Pressable accessibilityRole="button" disabled={busy || !verified} accessibilityState={{ disabled: busy || !verified }} style={[styles.linkButton, !verified && styles.disabled]} onPress={() => { setConfirming(true); setActionError(null); }}><Text style={styles.error}>Cancel request</Text></Pressable>}</View>}
      {motor && <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/explore/[id]', params: { id: motor.id } })} style={styles.motorLink}><Text style={styles.link}>View motor information ↗</Text></Pressable>}
    </> : !loading && !loadError ? <View style={styles.panel}><Text style={styles.heading}>Booking unavailable</Text><Text style={styles.copy}>This booking could not be found for your account. Return to My Bookings to see your requests.</Text></View> : null}
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 12, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' },
  linkButton: { minHeight: 44, paddingVertical: 10, justifyContent: 'center' }, link: { color: '#21484a', fontWeight: '600', fontSize: 13 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7, marginBottom: 4 },
  panel: { padding: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', gap: 14 }, heading: { color: '#1d2928', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 }, copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, caption: { color: '#65736e', fontSize: 12, lineHeight: 19 }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 }, value: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  motorHeader: { flexDirection: 'row', gap: 14, alignItems: 'center' }, photo: { width: 76, height: 76, borderRadius: 12, overflow: 'hidden', backgroundColor: '#eff2ec', justifyContent: 'center', alignItems: 'center' }, photoInitial: { color: '#526663', fontSize: 24, fontWeight: '600' }, motorCopy: { flex: 1, gap: 8 }, motorName: { color: '#1d2928', fontSize: 21, fontWeight: '600', letterSpacing: -0.4 },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, scheduleRow: { flexDirection: 'row', gap: 12 }, markerColumn: { width: 12, alignItems: 'center', paddingTop: 5 }, pickupMarker: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#21484a', backgroundColor: '#fff' }, returnMarker: { width: 9, height: 9, borderRadius: 2, backgroundColor: '#21484a' }, timeline: { width: 1, flex: 1, minHeight: 30, backgroundColor: '#dce3dc', marginVertical: 5 }, scheduleCopy: { flex: 1, gap: 3, paddingBottom: 12 },
  recordRow: { gap: 4, borderBottomWidth: 1, borderColor: '#edf0e9', paddingBottom: 12 }, recordValue: { color: '#273b37', fontSize: 14, lineHeight: 22 }, referenceBox: { backgroundColor: '#f5f7f2', padding: 12, borderRadius: 10 }, reference: { color: '#526663', fontSize: 12, lineHeight: 19 },
  error: { color: '#9b3d29', fontSize: 14, lineHeight: 22 }, success: { color: '#21623c', fontWeight: '600', lineHeight: 22 }, cancelButton: { padding: 16, minHeight: 52, backgroundColor: '#8c3730', borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#fff', fontWeight: '600', fontSize: 15 }, disabled: { opacity: 0.4 },
  outlineButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd' }, motorLink: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12 },
});

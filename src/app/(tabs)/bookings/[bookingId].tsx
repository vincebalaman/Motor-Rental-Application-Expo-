import { Image } from 'expo-image';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import BookingStatus from '@/components/booking-status';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type Booking, bookingErrorMessage, createBookingService, manilaToday } from '@/services/bookings';
import { formatBookingDate } from '@/services/booking-calendar';

export default function BookingDetailsRoute() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  return <BookingDetails key={`${user.id}:${bookingId}`} clientId={user.id} bookingId={bookingId} />;
}
function BookingDetails({ clientId, bookingId }: { clientId: string; bookingId: string }) {
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
  const today = manilaToday();
  const motor = motors.find(item => item.id === booking?.motor_id);
  const elapsed = booking && (booking.status === 'approved' ? booking.return_date <= today : booking.pickup_date < today);
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void load(); }} tintColor="#21484a" />}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.replace('/bookings')} style={styles.linkButton}><Text style={styles.link}>← My Bookings</Text></Pressable>
    <Text style={styles.eyebrow}>YOUR BOOKING</Text><Text style={styles.title}>Ride details</Text>
    {loadError && <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><SubmitButton title="TRY AGAIN" onPress={() => { void load(); }} /></View>}
    {loading && !booking && <ActivityIndicator color="#21484a" accessibilityLabel="Loading booking details" />}
    {notice && <Text accessibilityRole="alert" style={styles.success}>{notice}</Text>}
    {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
    {booking ? <>
      <View style={styles.motorCard}>
        {motor?.imageUrl ? <Image source={{ uri: motor.imageUrl }} contentFit="cover" style={styles.photo} accessibilityLabel={`${booking.motor_name} photo`} /> : <View style={[styles.photo, styles.placeholder]}><Text style={styles.copy}>Motor photo unavailable</Text></View>}
        <View style={styles.motorCopy}><BookingStatus booking={booking} today={today} /><Text style={styles.heading}>{booking.motor_name}</Text><Text style={styles.copy}>{booking.status === 'pending' ? elapsed ? 'The pickup date has passed. This request still awaits an admin decision; you can cancel it while it is pending.' : 'Awaiting admin approval. Your motor is not reserved yet.' : booking.status === 'approved' ? elapsed ? 'The scheduled rental dates have passed. This does not confirm pickup or return.' : 'Your request is approved for the dates below.' : booking.status === 'in_use' ? booking.return_date <= today ? 'The motor is still recorded as in use and is overdue. Contact the rental shop to arrange its return.' : 'Pickup has been recorded by the rental shop. Please return the motor by the scheduled return date.' : booking.status === 'completed' ? 'The rental shop has confirmed the motor was returned. This rental is completed.' : booking.status === 'rejected' ? 'The admin declined this request. You can explore other motors or dates.' : 'This request was cancelled and does not reserve a motor.'}</Text></View>
      </View>
      {booking.status === 'rejected' && <View style={styles.panel}><Text style={styles.heading}>Why your request was declined</Text><Text style={styles.copy}>{booking.rejection_reason || 'No reason was recorded for this older request. Contact the rental shop if you need more details.'}</Text>{!!booking.rejected_at && <Text style={styles.copy}>Rejected {new Date(booking.rejected_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}</View>}
      {booking.status === 'cancelled' && (booking.cancellation_source || booking.cancellation_reason) && <View style={styles.panel}><Text style={styles.heading}>{booking.cancellation_source === 'admin' ? 'Cancelled by the rental shop' : 'Cancelled by you'}</Text>{!!booking.cancellation_reason && <Text style={styles.copy}>{booking.cancellation_reason}</Text>}{!!booking.cancelled_at && <Text style={styles.copy}>Cancelled {new Date(booking.cancelled_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}<Text style={styles.copy}>These dates are no longer reserved by this booking. The original total is shown for reference; no refund or payment is processed here.</Text></View>}
      <View style={styles.panel}><Text style={styles.heading}>Rental dates</Text><Text style={styles.label}>PICKUP</Text><Text style={styles.value}>{formatBookingDate(booking.pickup_date, true)}</Text><Text style={styles.label}>RETURN</Text><Text style={styles.value}>{formatBookingDate(booking.return_date, true)}</Text><Text style={styles.copy}>Philippine calendar dates. The return date is not charged.</Text></View>
      <View style={styles.panel}><Text style={styles.heading}>Price breakdown</Text><Text style={styles.copy}>{(Date.parse(booking.return_date) - Date.parse(booking.pickup_date)) / 86400000} rental days × {dailyPrice(booking.daily_rate_centavos / 100)} / day</Text><View style={styles.totalRow}><Text style={styles.value}>Total</Text><Text style={styles.total}>{dailyPrice(booking.total_centavos / 100)}</Text></View><Text style={styles.copy}>This is the rate saved with your request. Later catalog price changes do not change this total. Payment is not collected in this app yet.</Text></View>
      {!!booking.picked_up_at && <View style={styles.panel}><Text style={styles.heading}>Handover record</Text><Text style={styles.copy}>Picked up: {new Date(booking.picked_up_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>{!!booking.returned_at && <Text style={styles.copy}>Returned: {new Date(booking.returned_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text>}<Text style={styles.copy}>Confirmed by the rental shop. The original rental total is unchanged.</Text></View>}
      <View style={styles.panel}><Text style={styles.heading}>Booking reference</Text><Text selectable style={styles.reference}>{booking.id}</Text><Text style={styles.copy}>Requested {new Date(booking.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text><Text style={styles.copy}>Last updated {new Date(booking.updated_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} (PH)</Text></View>
      {booking.status === 'pending' && <View style={styles.panel}>{confirming ? <>
        <Text style={styles.heading}>Cancel this request?</Text><Text style={styles.copy}>The admin will no longer be able to approve it. You can submit a new request later.</Text>
        <Pressable accessibilityRole="button" disabled={busy || !verified} accessibilityState={{ disabled: busy || !verified, busy }} onPress={() => { void cancelRequest(); }} style={[styles.cancelButton, (busy || !verified) && styles.disabled]}>{busy ? <ActivityIndicator color="#faf8f2" /> : <Text style={styles.cancelText}>CONFIRM CANCELLATION</Text>}</Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(false)} style={styles.linkButton}><Text style={styles.link}>Keep request</Text></Pressable>
      </> : <Pressable accessibilityRole="button" disabled={busy || !verified} accessibilityState={{ disabled: busy || !verified }} style={[styles.linkButton, !verified && styles.disabled]} onPress={() => { setConfirming(true); setActionError(null); }}><Text style={styles.error}>Cancel pending request</Text></Pressable>}</View>}
      {motor && <SubmitButton title="VIEW MOTOR" onPress={() => router.push({ pathname: '/explore/[id]', params: { id: motor.id } })} />}
    </> : !loading && !loadError ? <View style={styles.panel}><Text style={styles.heading}>Booking unavailable</Text><Text style={styles.copy}>This booking could not be found for your account. Return to My Bookings to see your requests.</Text></View> : null}
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 22, gap: 16, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, linkButton: { minHeight: 44, paddingVertical: 10, justifyContent: 'center' }, link: { color: '#21484a', fontWeight: '700', fontSize: 14 }, eyebrow: { color: '#687e6b', fontSize: 10, letterSpacing: 1.8, fontWeight: '800' }, title: { color: '#183334', fontSize: 30, fontWeight: '800' }, panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 22, gap: 13 }, heading: { color: '#21484a', fontSize: 22, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 23 }, label: { color: '#7a897d', fontSize: 10, letterSpacing: 1.5, fontWeight: '800' }, value: { color: '#21484a', fontSize: 17, fontWeight: '700' }, total: { color: '#21484a', fontSize: 26, fontWeight: '800' }, totalRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: '#e1e4d9', paddingTop: 14 }, reference: { color: '#526e65', fontSize: 13 }, error: { color: '#991b1b', fontSize: 14, lineHeight: 22 }, success: { color: '#21623c', fontWeight: '700', lineHeight: 22 }, motorCard: { borderRadius: 22, backgroundColor: '#faf8f2', overflow: 'hidden' }, photo: { width: '100%', height: 200 }, placeholder: { backgroundColor: '#e2e9df', alignItems: 'center', justifyContent: 'center' }, motorCopy: { padding: 22, gap: 14 }, cancelButton: { padding: 18, minHeight: 54, backgroundColor: '#8c3730', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#faf8f2', fontWeight: '800', fontSize: 12 }, disabled: { opacity: 0.4 },
});

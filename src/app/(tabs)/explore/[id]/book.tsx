import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BookingCalendar from '@/components/booking-calendar';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { dailyPrice } from '@/components/catalog-card';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type Booking, bookingErrorMessage, createBookingService, manilaToday, rentalDays } from '@/services/bookings';
import { type DateRange, formatBookingDate, rangeIsBlocked } from '@/services/booking-calendar';

type Quote = DateRange & { rate: number; days: number };
export default function BookingForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { motors, refresh } = useMotorInventory();
  const motor = motors.find(item => item.id === id);
  const { request } = useBookings();
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [range, setRange] = useState<DateRange>({ pickup: '', returned: '' });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [blocked, setBlocked] = useState<string[] | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Booking | null>(null);
  const running = useRef(false);
  const focused = useRef(false);
  const generation = useRef(0);
  const loadAvailability = useCallback(async () => {
    if (!focused.current) return;
    const version = ++generation.current;
    setAvailabilityLoading(true); setAvailabilityError(null); setBlocked(null);
    try {
      const dates = await service.blockedDates(id);
      if (focused.current && version === generation.current) setBlocked(dates);
    } catch {
      if (focused.current && version === generation.current) setAvailabilityError('We could not check available dates. Please refresh the calendar before booking.');
    } finally {
      if (focused.current && version === generation.current) setAvailabilityLoading(false);
    }
  }, [id, service]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void loadAvailability();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void loadAvailability(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [loadAvailability]));

  const today = manilaToday();
  let days: number | null = null, dateError: string | null = null;
  if (range.pickup && range.returned) {
    try {
      days = rentalDays(range.pickup, range.returned, today);
      if (blocked && rangeIsBlocked(range.pickup, range.returned, blocked)) {
        days = null; dateError = 'Those dates are no longer available. Please choose a new range.';
      }
    } catch (cause) { dateError = bookingErrorMessage(cause); }
  }
  const changeDates = (value: DateRange) => { setRange(value); setQuote(null); setError(null); };
  const review = () => {
    if (!motor || !days || !blocked || availabilityLoading || running.current) return;
    setError(null);
    setQuote({ ...range, rate: Math.round(motor.price * 100), days });
  };
  const submit = async () => {
    if (!motor || !quote || !blocked || availabilityLoading || running.current || saved) return;
    running.current = true; setBusy(true); setError(null);
    try {
      rentalDays(quote.pickup, quote.returned);
      if (rangeIsBlocked(quote.pickup, quote.returned, blocked)) throw new Error('booking_dates_unavailable');
      if (quote.rate !== Math.round(motor.price * 100)) throw new Error('booking_rate_changed');
      const result = await request(motor.id, quote.pickup, quote.returned, quote.rate);
      setSaved(result);
    } catch (cause) {
      setError(bookingErrorMessage(cause)); setQuote(null); refresh(); void loadAvailability();
    } finally { running.current = false; setBusy(false); }
  };
  const displayedRate = saved?.daily_rate_centavos ?? quote?.rate ?? Math.round((motor?.price ?? 0) * 100);
  const displayedDays = saved ? (Date.parse(saved.return_date) - Date.parse(saved.pickup_date)) / 86400000 : quote?.days ?? days;
  const displayRange = saved ? { pickup: saved.pickup_date, returned: saved.return_date } : quote ?? range;
  const ready = !!days && blocked !== null && !availabilityLoading && !busy;
  return <MainSafe><ScrollView contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => quote ? setQuote(null) : router.replace({ pathname: '/explore/[id]', params: { id } })} style={styles.linkButton}><Text style={styles.link}>← {quote ? 'Edit dates' : 'Motor details'}</Text></Pressable>
    <Text style={styles.eyebrow}>{saved ? 'REQUEST SAVED' : quote ? 'ONE LAST LOOK' : 'YOUR NEXT RIDE'}</Text>
    <Text style={styles.title}>{saved ? saved.status === 'approved' ? 'Your ride is already approved.' : 'Your request is on its way.' : quote ? 'Review your booking' : 'When are you riding?'}</Text>
    {motor || saved ? <>
      <View style={styles.motorCard}>
        {motor?.imageUrl ? <Image source={{ uri: motor.imageUrl }} contentFit="cover" style={styles.photo} accessibilityLabel={`${motor.name} photo`} /> : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={styles.copy}>Motor photo unavailable</Text></View>}
        <View style={styles.motorCopy}><Text style={styles.heading}>{saved?.motor_name ?? motor?.name}</Text><Text style={styles.copy}>{motor?.type}{motor?.type ? ' · ' : ''}{dailyPrice(displayedRate / 100)} / day</Text></View>
      </View>
      {saved ? <View style={styles.notice}>
        <Text accessibilityRole="alert" style={styles.heading}>{saved.status === 'approved' ? 'Already approved' : 'Pending admin approval'}</Text>
        <Text style={styles.copy}>{saved.status === 'approved' ? 'You already have an approved booking for these dates. View it in My Bookings.' : 'Your request is saved. Your motor is reserved only after the admin approves it.'}</Text>
      </View> : <>
        {!quote && <>
          <View style={styles.dateRow}>
            <View style={styles.dateBox}><Text style={styles.label}>PICKUP</Text><Text style={styles.dateText}>{range.pickup ? formatBookingDate(range.pickup) : 'Choose a date'}</Text></View>
            <View style={styles.dateBox}><Text style={styles.label}>RETURN</Text><Text style={styles.dateText}>{range.returned ? formatBookingDate(range.returned) : 'Choose a date'}</Text></View>
          </View>
          <View style={styles.calendarToolbar}><Text style={styles.copy}>Philippine time · 1–90 rental days</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => changeDates({ pickup: '', returned: '' })} style={styles.linkButton}><Text style={styles.link}>Clear dates</Text></Pressable></View>
        </>}
        {availabilityLoading ? <View style={styles.status}><ActivityIndicator color="#21484a" /><Text style={styles.copy}>Checking available dates…</Text></View> : availabilityError ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{availabilityError}</Text><SubmitButton title="REFRESH CALENDAR" onPress={() => { void loadAvailability(); }} /></View> : !quote && blocked !== null ? <BookingCalendar range={range} blocked={blocked} today={today} disabled={busy} onChange={changeDates} /> : null}
        {!quote && <Text style={styles.hint}>Tap pickup, then return. You can plan a pickup up to 365 days ahead. Pending requests do not block dates.</Text>}
        {dateError && <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text>}
      </>}
      <View style={styles.panel}>
        <Text style={styles.heading}>Rental summary</Text>
        {!!displayRange.pickup && !!displayRange.returned && <View style={styles.summaryRow}><Text style={styles.copy}>{formatBookingDate(displayRange.pickup)} → {formatBookingDate(displayRange.returned)}</Text></View>}
        <View style={styles.summaryRow}><Text style={styles.copy}>{displayedDays ? `${displayedDays} ${displayedDays === 1 ? 'day' : 'days'} × ${dailyPrice(displayedRate / 100)}` : 'Choose dates to see your total'}</Text><Text style={styles.label}>DAILY RENTAL</Text></View>
        <View style={styles.totalRow}><Text style={styles.heading}>Total</Text><Text accessibilityLiveRegion="polite" style={styles.total}>{saved ? dailyPrice(saved.total_centavos / 100) : displayedDays ? dailyPrice(displayedRate * displayedDays / 100) : '—'}</Text></View>
        <Text style={styles.hint}>The return date is not charged. Nov 21 → Nov 23 is two days.</Text>
        <Text style={styles.approval}>Requires admin approval</Text><Text style={styles.copy}>No payment is collected at this step.</Text>
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {saved ? <SubmitButton title="VIEW MY BOOKINGS" onPress={() => router.navigate('/bookings')} /> : quote ? <>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={() => { void submit(); }} style={[styles.primary, !ready && styles.disabled]}>{busy ? <ActivityIndicator color="#faf8f2" /> : <Text style={styles.primaryText}>CONFIRM BOOKING REQUEST →</Text>}</Pressable>
        <Text style={styles.hint}>Availability is checked again when you confirm. This sends a request, not an instant reservation.</Text>
      </> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={review} style={[styles.primary, !ready && styles.disabled]}><Text style={styles.primaryText}>REVIEW BOOKING →</Text></Pressable>}
    </> : <Text style={styles.copy}>This motor is no longer listed. Return to Explore and choose another ride.</Text>}
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 22, gap: 16, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 3 }, link: { color: '#21484a', fontSize: 14, fontWeight: '700' }, eyebrow: { color: '#6b806d', fontSize: 10, fontWeight: '800', letterSpacing: 2 }, title: { color: '#183334', fontSize: 30, fontWeight: '800' }, motorCard: { backgroundColor: '#faf8f2', borderRadius: 22, overflow: 'hidden' }, photo: { height: 180, width: '100%' }, photoPlaceholder: { backgroundColor: '#e2e9df', justifyContent: 'center', alignItems: 'center' }, motorCopy: { padding: 20, gap: 7 }, heading: { color: '#21484a', fontSize: 20, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 22 }, hint: { color: '#7a887e', fontSize: 12, lineHeight: 19 }, dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, dateBox: { flex: 1, minWidth: 120, padding: 16, gap: 10, backgroundColor: '#e6ecdf', borderRadius: 16 }, label: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, dateText: { color: '#21484a', fontSize: 15, fontWeight: '700' }, calendarToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }, status: { padding: 30, alignItems: 'center', gap: 12 }, notice: { padding: 20, borderRadius: 18, backgroundColor: '#e6ecdf', gap: 12 }, panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 22, gap: 14 }, summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderColor: '#e1e4da', paddingTop: 16 }, total: { color: '#21484a', fontSize: 30, fontWeight: '800' }, approval: { color: '#825510', fontSize: 13, fontWeight: '800' }, error: { color: '#991b1b', fontSize: 14, lineHeight: 22 }, primary: { minHeight: 56, padding: 18, borderRadius: 14, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#faf8f2', fontSize: 12, fontWeight: '800', letterSpacing: 1 }, disabled: { opacity: 0.45 },
});

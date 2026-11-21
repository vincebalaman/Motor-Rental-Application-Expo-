import { useBookingClock } from '@/hooks/use-booking-clock';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import BookingTimePicker from '@/components/booking-time-picker';
import { type BookedPeriod, rentalSchedule, formatRentalTime, fullyBlockedDays, scheduleOverlaps } from '@/services/booking-time';
import BookingCalendar from '@/components/booking-calendar';
import MainSafe from '@/components/mainsafe';
import { dailyPrice } from '@/components/catalog-card';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type Booking, bookingErrorMessage, createBookingService, manilaToday } from '@/services/bookings';
import { type DateRange, formatBookingDate } from '@/services/booking-calendar';

type Quote = { pickup: string; returned: string } & { rate: number; days: number };
export default function BookingForm() {
  const clock = useBookingClock();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { motors, refresh } = useMotorInventory();
  const motor = motors.find(item => item.id === id);
  const { request } = useBookings();
  const service = useMemo(() => createBookingService(getSupabaseClient()), []);
  const [range, setRange] = useState<DateRange>({ pickup: '', returned: '' });
  const [pickupTime, setPickupTime] = useState('');
  const [rentalDayCount, setRentalDayCount] = useState('1');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [blocked, setBlocked] = useState<BookedPeriod[] | null>(null);
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
      const dates = await service.bookedPeriods(id);
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

  const today = manilaToday(new Date(clock));
  let schedule: ReturnType<typeof rentalSchedule> | null = null, dateError: string | null = null;
  if (range.pickup && pickupTime) {
    try {
      schedule = rentalSchedule(range.pickup, pickupTime, Number(rentalDayCount), clock);
      if (blocked && scheduleOverlaps(schedule.pickup, schedule.returned, blocked)) {
        schedule = null; dateError = 'This rental overlaps an approved or active ride. Choose another pickup time, date, or duration.';
      }
    } catch (cause) { dateError = (cause as Error).message; }
  }
  const days = schedule?.days ?? null;
  const changeDates = (value: DateRange) => { setRange(value); setQuote(null); setError(null); };
  const review = () => {
    if (!motor || !schedule || !days || !blocked || availabilityLoading || running.current) return;
    setError(null);
    setQuote({ ...schedule, rate: Math.round(motor.price * 100), days });
  };
  const submit = async () => {
    if (!motor || !quote || !blocked || availabilityLoading || running.current || saved) return;
    running.current = true; setBusy(true); setError(null);
    try {
      rentalSchedule(range.pickup, pickupTime, quote.days);
      if (scheduleOverlaps(quote.pickup, quote.returned, blocked)) throw new Error('booking_dates_unavailable');
      if (quote.rate !== Math.round(motor.price * 100)) throw new Error('booking_rate_changed');
      const result = await request(motor.id, quote.pickup, quote.days, quote.rate);
      setSaved(result);
    } catch (cause) {
      setError(bookingErrorMessage(cause)); setQuote(null); refresh(); void loadAvailability();
    } finally { running.current = false; setBusy(false); }
  };
  const displayedRate = saved?.daily_rate_centavos ?? quote?.rate ?? Math.round((motor?.price ?? 0) * 100);
  const displayedDays = saved ? (Date.parse(saved.return_date) - Date.parse(saved.pickup_date)) / 86400000 : quote?.days ?? days;
  const displaySchedule = saved?.scheduled_pickup_at && saved.scheduled_return_at ? { pickup: saved.scheduled_pickup_at, returned: saved.scheduled_return_at } : quote ?? schedule;
  const ready = !!days && blocked !== null && !availabilityLoading && !busy;
  return <MainSafe><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => quote ? setQuote(null) : router.replace({ pathname: '/explore/[id]', params: { id } })} style={styles.linkButton}><Text style={styles.link}>← {quote ? 'Edit schedule' : 'Motor details'}</Text></Pressable>
    <View style={styles.steps}>{['Schedule', 'Review', 'Request'].map((step, index) => <View key={step} style={styles.step}><View style={[styles.stepDot, index <= (saved ? 2 : quote ? 1 : 0) && styles.activeStep]}><Text style={[styles.stepNumber, index <= (saved ? 2 : quote ? 1 : 0) && styles.activeStepText]}>{index + 1}</Text></View><Text style={styles.hint}>{step}</Text></View>)}</View>
    <Text accessibilityRole="header" style={styles.title}>{saved ? saved.status === 'in_use' ? 'Your motor is already in use.' : saved.status === 'approved' ? 'Your ride is already approved.' : 'Request sent' : quote ? 'Review your booking' : 'Plan your ride'}</Text>
    {motor || saved ? <>
      <View style={styles.motorCard}>
        {motor?.imageUrl ? <Image source={{ uri: motor.imageUrl }} contentFit="cover" style={styles.photo} accessibilityLabel={`${motor.name} photo`} /> : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={styles.photoInitial}>{(saved?.motor_name ?? motor?.name)?.charAt(0)}</Text></View>}
        <View style={styles.motorCopy}><Text style={styles.heading}>{saved?.motor_name ?? motor?.name}</Text><Text style={styles.copy}>{motor?.type}{motor?.type ? ' · ' : ''}{dailyPrice(displayedRate / 100)} / day</Text></View>
      </View>
      {saved ? <View style={styles.notice}>
        <Text accessibilityRole="alert" style={styles.heading}>{saved.status === 'in_use' ? 'Already in use' : saved.status === 'approved' ? 'Already approved' : 'Pending admin approval'}</Text>
        <Text style={styles.copy}>{saved.status === 'in_use' ? 'You already have an active rental for these dates. View it in My Bookings.' : saved.status === 'approved' ? 'You already have an approved booking for these dates. View it in My Bookings.' : 'Your request is saved. Your motor is reserved only after the admin approves it.'}</Text>
      </View> : <>
        {!quote && <>
          <View style={styles.dateRow}>
            <View style={styles.dateBox}><Text style={styles.label}>Pickup date</Text><Text style={styles.dateText}>{range.pickup ? formatBookingDate(range.pickup) : 'Choose a date'}</Text></View>
            <View style={styles.dateBox}><Text style={styles.label}>Pickup time · PHT</Text><BookingTimePicker value={pickupTime} disabled={busy} onChange={value => { setPickupTime(value); setQuote(null); setError(null); }} /></View>
          </View>
          <View style={styles.calendarToolbar}><Text style={styles.copy}>Choose your pickup date</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => changeDates({ pickup: '', returned: '' })} style={styles.linkButton}><Text style={styles.link}>Clear date</Text></Pressable></View>
        </>}
        {availabilityLoading ? <View style={styles.status}><ActivityIndicator color="#21484a" /><Text style={styles.copy}>Checking available dates…</Text></View> : availabilityError ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{availabilityError}</Text><Pressable accessibilityRole="button" onPress={() => { void loadAvailability(); }} style={styles.outlineButton}><Text style={styles.link}>Refresh calendar</Text></Pressable></View> : !quote && blocked !== null ? <BookingCalendar pickupOnly range={range} blocked={fullyBlockedDays(blocked, today)} today={today} disabled={busy} onChange={changeDates} /> : null}
        {!quote && <View style={styles.panel}>
          <View style={styles.sectionHeader}><Text style={styles.heading}>Rental duration</Text><Text style={styles.hint}>1–90 days</Text></View>
          <View style={styles.dayControls}>
            <Pressable accessibilityRole="button" accessibilityLabel="One fewer rental day" disabled={busy || Number(rentalDayCount) <= 1} onPress={() => setRentalDayCount(String(Math.max(1, Number(rentalDayCount) - 1)))} style={[styles.dayButton, (busy || Number(rentalDayCount) <= 1) && styles.disabled]}><Text style={styles.heading}>−</Text></Pressable>
            <TextInput accessibilityLabel="Rental days, 1 to 90" keyboardType="number-pad" maxLength={2} editable={!busy} value={rentalDayCount} onChangeText={value => { setRentalDayCount(value.replace(/[^0-9]/g, '')); setQuote(null); }} style={styles.dayInput} selectTextOnFocus />
            <Pressable accessibilityRole="button" accessibilityLabel="One more rental day" disabled={busy || Number(rentalDayCount) >= 90} onPress={() => setRentalDayCount(String(Math.min(90, Number(rentalDayCount) + 1)))} style={[styles.dayButton, (busy || Number(rentalDayCount) >= 90) && styles.disabled]}><Text style={styles.heading}>+</Text></Pressable>
          </View>
          <View style={styles.quickDays}>{[1, 3, 7].map(count => <Pressable key={count} accessibilityRole="button" accessibilityLabel={`${count} rental ${count === 1 ? 'day' : 'days'}`} accessibilityState={{ selected: Number(rentalDayCount) === count, disabled: busy }} disabled={busy} onPress={() => { setRentalDayCount(String(count)); setQuote(null); setError(null); }} style={[styles.quickDay, Number(rentalDayCount) === count && styles.selectedDay]}><Text style={[styles.hint, Number(rentalDayCount) === count && styles.selectedDayText]}>{count} {count === 1 ? 'day' : 'days'}</Text></Pressable>)}</View>
          <Text style={styles.hint}>Each day is 24 hours. Your return time is calculated automatically.</Text>
        </View>}
        {dateError && <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text>}
      </>}
      <View style={styles.panel}>
        <Text style={styles.heading}>Rental summary</Text>
        {displaySchedule && <View style={styles.scheduleSummary}><Text style={styles.label}>Pickup · Philippine time</Text><Text style={styles.dateText}>{formatRentalTime(displaySchedule.pickup)}</Text><View style={styles.returnSummary}><Text style={styles.label}>Return by · Philippine time</Text><Text accessibilityLiveRegion="polite" style={styles.returnTime}>{formatRentalTime(displaySchedule.returned)}</Text></View></View>}
        <View style={styles.summaryRow}><Text style={styles.copy}>{displayedDays ? `${displayedDays} ${displayedDays === 1 ? 'day' : 'days'} × ${dailyPrice(displayedRate / 100)}` : 'Choose a schedule to see your total'}</Text><Text style={styles.label}>Daily rate</Text></View>
        <View style={styles.totalRow}><Text style={styles.heading}>Base rental</Text><Text accessibilityLiveRegion="polite" style={styles.total}>{saved ? dailyPrice(saved.total_centavos / 100) : displayedDays ? dailyPrice(displayedRate * displayedDays / 100) : '—'}</Text></View>
        <View style={styles.policy}><Text style={styles.policyTitle}>Late return policy</Text><Text style={styles.hint}>₱200 per completed late hour, for every motor. Under 1 hour adds ₱0; 6 hours 10 minutes adds ₱1,200.</Text><Text style={styles.hint}>Final charges are recorded when the admin confirms return.</Text></View>
        <Text style={styles.approval}>Admin approval required · No payment at this step</Text>
      </View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {saved ? <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.primary}><Text style={styles.primaryText}>View my bookings →</Text></Pressable> : quote ? <>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready, busy }} disabled={!ready} onPress={() => { void submit(); }} style={[styles.primary, !ready && styles.disabled]}>{busy ? <ActivityIndicator color="#faf8f2" /> : <Text style={styles.primaryText}>Confirm request →</Text>}</Pressable>
        <Text style={styles.hint}>Availability is checked again when you confirm. This sends a request, not an instant reservation.</Text>
      </> : <Pressable accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={review} style={[styles.primary, !ready && styles.disabled]}><Text style={styles.primaryText}>Review booking →</Text></Pressable>}
    </> : <Text style={styles.copy}>This motor is no longer listed. Return to Explore and choose another ride.</Text>}
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 12, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center' }, linkButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 }, link: { color: '#21484a', fontSize: 13, fontWeight: '600' }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 },
  steps: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 6 }, step: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }, stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e5eae3', alignItems: 'center', justifyContent: 'center' }, activeStep: { backgroundColor: '#21484a' }, stepNumber: { color: '#526663', fontSize: 11, fontWeight: '600' }, activeStepText: { color: '#fff' },
  motorCard: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18 }, photo: { height: 72, width: 72, borderRadius: 12 }, photoPlaceholder: { backgroundColor: '#eff2ec', justifyContent: 'center', alignItems: 'center' }, photoInitial: { color: '#526663', fontSize: 24, fontWeight: '600' }, motorCopy: { flex: 1, gap: 6 }, heading: { color: '#1d2928', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 }, copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, hint: { color: '#65736e', fontSize: 12, lineHeight: 19 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, dateBox: { flex: 1, minWidth: 140, padding: 14, gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 14 }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 }, dateText: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500' }, calendarToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, status: { padding: 24, alignItems: 'center', gap: 12 }, notice: { padding: 20, borderRadius: 18, backgroundColor: '#edf2e9', gap: 12, borderWidth: 1, borderColor: '#dce5d7' },
  panel: { padding: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18, gap: 14 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, dayControls: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center' }, dayButton: { minWidth: 48, minHeight: 48, backgroundColor: '#f2f5ef', borderWidth: 1, borderColor: '#e2e5de', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, dayInput: { minWidth: 76, minHeight: 54, borderWidth: 1, borderColor: '#dce4dd', borderRadius: 12, textAlign: 'center', color: '#1d2928', fontSize: 24, fontWeight: '600', padding: 10 }, quickDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }, quickDay: { minHeight: 44, minWidth: 68, padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2f5ef', borderWidth: 1, borderColor: '#e2e5de' }, selectedDay: { borderColor: '#21484a', backgroundColor: '#edf2e9' }, selectedDayText: { color: '#21484a', fontWeight: '600' },
  scheduleSummary: { gap: 6 }, returnSummary: { marginTop: 6, padding: 14, backgroundColor: '#f2f5ef', borderRadius: 12, gap: 6 }, returnTime: { color: '#21484a', fontSize: 18, lineHeight: 26, fontWeight: '600' }, summaryRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 16 }, total: { color: '#1d2928', fontSize: 26, fontWeight: '600', letterSpacing: -0.5 }, policy: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderColor: '#edf0e9' }, policyTitle: { color: '#273b37', fontSize: 13, fontWeight: '600' }, approval: { color: '#805917', fontSize: 12, lineHeight: 19 }, error: { color: '#9b3d29', fontSize: 14, lineHeight: 22 },
  primary: { minHeight: 54, padding: 16, borderRadius: 13, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' }, outlineButton: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd', justifyContent: 'center', alignSelf: 'flex-start' }, disabled: { opacity: 0.4 },
});

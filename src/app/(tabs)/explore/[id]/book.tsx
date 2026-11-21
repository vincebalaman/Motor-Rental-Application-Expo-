import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import BookingCalendar from '@/components/booking-calendar';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { dailyPrice } from '@/components/catalog-card';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import {
  addCalendarDays,
  bookingErrorMessage,
  hasApprovedDateConflict,
  manilaToday,
  rentalDays,
  type ApprovedDateRange,
} from '@/services/bookings';

export default function BookingForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { motors, refresh } = useMotorInventory();
  const motor = motors.find(item => item.id === id);
  const { request, availability } = useBookings();
  const [pickup, setPickup] = useState('');
  const [returned, setReturned] = useState('');
  const [approvedDates, setApprovedDates] = useState<ApprovedDateRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [availabilityRetry, setAvailabilityRetry] = useState(0);
  const [dateMessage, setDateMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const running = useRef(false);
  const availabilityRequest = useRef(0);
  const today = manilaToday();
  const maxPickup = addCalendarDays(today, 365);
  const maxReturn = addCalendarDays(today, 455);
  const availabilityEnd = addCalendarDays(today, 456);

  const loadAvailability = useCallback(async (requestToken?: number) => {
    if (!motor) return;
    const requestId = requestToken ?? ++availabilityRequest.current;
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    try {
      const ranges = await availability(motor.id, today, availabilityEnd);
      if (availabilityRequest.current === requestId) setApprovedDates(ranges);
    } catch (cause) {
      if (availabilityRequest.current === requestId) setAvailabilityError(bookingErrorMessage(cause));
    } finally {
      if (availabilityRequest.current === requestId) setAvailabilityLoading(false);
    }
  }, [availability, availabilityEnd, motor, today]);

  useEffect(() => {
    const requestRef = availabilityRequest;
    const requestId = ++availabilityRequest.current;
    const timer = setTimeout(() => { void loadAvailability(requestId); }, 0);
    return () => {
      clearTimeout(timer);
      if (requestRef.current === requestId) requestRef.current++;
    };
  }, [loadAvailability, availabilityRetry]);

  let days: number | null = null;
  let dateError: string | null = null;
  if (pickup && returned) {
    try {
      days = rentalDays(pickup, returned, today);
      if (hasApprovedDateConflict(pickup, returned, approvedDates)) {
        days = null;
        dateError = 'These dates overlap an approved booking. Choose another date range.';
      }
    } catch (cause) {
      dateError = bookingErrorMessage(cause);
    }
  }

  const selectDate = (date: string) => {
    setError(null);
    setDateMessage(null);
    if (!pickup || returned) {
      setPickup(date);
      setReturned('');
      return;
    }
    setReturned(date);
  };

  const submit = async () => {
    if (!motor || running.current || saved || !pickup || !returned || !days || availabilityLoading || availabilityError) return;
    if (hasApprovedDateConflict(pickup, returned, approvedDates)) {
      setDateMessage('An approved booking now overlaps these dates. Refresh the calendar and choose another range.');
      void loadAvailability();
      return;
    }
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await request(motor.id, pickup, returned, Math.round(motor.price * 100));
      setSaved(result.status);
    } catch (cause) {
      setError(bookingErrorMessage(cause));
      refresh();
      void loadAvailability();
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return (
    <MainSafe>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/explore/[id]', params: { id } })} style={styles.linkButton}>
            <Text style={styles.link}>← Motor details</Text>
          </Pressable>
          <Text style={styles.title}>{saved ? 'Request received' : 'Plan your ride'}</Text>
          {saved ? (
            <View style={styles.panel}>
              <Text accessibilityRole="alert" style={styles.heading}>{saved === 'approved' ? 'You already have an approved booking for these dates.' : 'Your request is saved.'}</Text>
              <Text style={styles.copy}>View its latest status in My Bookings. A pending request is not a confirmed reservation.</Text>
              <SubmitButton title="VIEW MY BOOKINGS" onPress={() => router.navigate('/bookings')} />
            </View>
          ) : motor ? (
            <>
              <View style={styles.panel}>
                <Text style={styles.heading}>{motor.name}</Text>
                <Text style={styles.copy}>{motor.type} · {dailyPrice(motor.price)} / day</Text>
              </View>

              <View style={styles.sectionHeading}>
                <View style={styles.sectionCopy}>
                  <Text style={styles.label}>Choose your dates</Text>
                  <Text style={styles.copy}>{pickup && !returned ? 'Now select a return date.' : 'Tap a date to start your rental.'}</Text>
                </View>
                {pickup ? (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => { setPickup(''); setReturned(''); setDateMessage(null); setError(null); }}
                    style={styles.resetButton}
                  >
                    <Text style={styles.resetText}>Start over</Text>
                  </Pressable>
                ) : null}
              </View>

              {availabilityLoading ? (
                <View style={styles.loadingPanel}>
                  <ActivityIndicator color="#21484a" accessibilityLabel="Loading approved booking dates" />
                  <Text style={styles.copy}>Checking approved booking dates…</Text>
                </View>
              ) : availabilityError ? (
                <View style={styles.panel}>
                  <Text accessibilityRole="alert" style={styles.error}>{availabilityError}</Text>
                  <Pressable accessibilityRole="button" onPress={() => setAvailabilityRetry(value => value + 1)} style={styles.retryButton}>
                    <Text style={styles.retryText}>Retry availability</Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <BookingCalendar
                    today={today}
                    maxPickup={maxPickup}
                    maxReturn={maxReturn}
                    pickup={pickup}
                    returned={returned}
                    approvedDates={approvedDates}
                    onSelectDate={selectDate}
                  />
                  <Text style={styles.copy}>Dates use Philippine time. Return day is not charged. Rentals are 1–90 days; pickup dates are available up to 365 days ahead.</Text>
                </>
              )}

              <View style={styles.selectedDates}>
                <View style={styles.dateValue}>
                  <Text style={styles.dateLabel}>PICKUP</Text>
                  <Text style={styles.dateText}>{pickup || 'Select date'}</Text>
                </View>
                <Text style={styles.dateSeparator}>→</Text>
                <View style={styles.dateValue}>
                  <Text style={styles.dateLabel}>RETURN</Text>
                  <Text style={styles.dateText}>{returned || 'Select date'}</Text>
                </View>
              </View>

              {dateMessage && <Text accessibilityRole="alert" style={styles.error}>{dateMessage}</Text>}
              {dateError && <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text>}
              <View style={styles.panel}>
                <Text style={styles.label}>Rental summary</Text>
                <Text style={styles.copy}>{days ? `${days} ${days === 1 ? 'day' : 'days'} × ${dailyPrice(motor.price)}` : 'Select available pickup and return dates to see your total.'}</Text>
                <Text style={styles.total}>{days ? dailyPrice(Math.round(motor.price * 100) * days / 100) : '—'}</Text>
                <Text style={styles.copy}>Only admin-approved bookings block dates. Pending requests do not reserve a motor. This step does not collect payment.</Text>
              </View>
              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              {days && !availabilityLoading && !availabilityError && (
                <SubmitButton title="SUBMIT BOOKING REQUEST" onPress={submit} isSubmitting={busy} />
              )}
            </>
          ) : (
            <Text style={styles.copy}>This motor is no longer listed. Return to Explore and choose another motor.</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { padding: 20, paddingBottom: 36, gap: 16, maxWidth: 780, width: '100%', alignSelf: 'center' },
  title: { color: '#183334', fontSize: 30, lineHeight: 38, fontWeight: '800' },
  panel: { padding: 20, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9', borderRadius: 18, gap: 12 },
  heading: { color: '#21484a', fontSize: 21, lineHeight: 28, fontWeight: '800' },
  label: { color: '#21484a', fontSize: 16, fontWeight: '800' },
  copy: { color: '#687a75', fontSize: 14, lineHeight: 22 },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionCopy: { flex: 1, minWidth: 180, gap: 4 },
  loadingPanel: { minHeight: 130, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20, backgroundColor: '#faf8f2', borderRadius: 18 },
  retryButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#e6eadd' },
  retryText: { color: '#21484a', fontSize: 14, fontWeight: '800' },
  resetButton: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#e6eadd' },
  resetText: { color: '#21484a', fontSize: 13, fontWeight: '800' },
  selectedDates: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 16, backgroundColor: '#e6eadd' },
  dateValue: { flex: 1, minWidth: 0, gap: 5 },
  dateLabel: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  dateText: { color: '#183334', fontSize: 14, lineHeight: 20, fontWeight: '800' },
  dateSeparator: { color: '#526e65', fontSize: 18, fontWeight: '700' },
  total: { color: '#21484a', fontSize: 30, lineHeight: 38, fontWeight: '800' },
  error: { color: '#991b1b', fontSize: 14, lineHeight: 22 },
  link: { color: '#21484a', fontSize: 15, fontWeight: '700' },
  linkButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
});

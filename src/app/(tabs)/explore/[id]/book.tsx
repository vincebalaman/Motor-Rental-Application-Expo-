import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Input from '@/components/input';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { dailyPrice } from '@/components/catalog-card';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { bookingErrorMessage, manilaToday, rentalDays } from '@/services/bookings';

export default function BookingForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { motors, refresh } = useMotorInventory();
  const motor = motors.find(item => item.id === id);
  const { request } = useBookings();
  const [pickup, setPickup] = useState('');
  const [returned, setReturned] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const running = useRef(false);
  let days: number | null = null, dateError: string | null = null;
  if (pickup && returned) {
    try { days = rentalDays(pickup, returned); } catch (cause) { dateError = bookingErrorMessage(cause); }
  }
  const submit = async () => {
    if (!motor || running.current || saved) return;
    running.current = true; setBusy(true); setError(null);
    try {
      const result = await request(motor.id, pickup, returned, Math.round(motor.price * 100));
      setSaved(result.status);
    } catch (cause) { setError(bookingErrorMessage(cause)); refresh(); }
    finally { running.current = false; setBusy(false); }
  };
  return <MainSafe><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" onPress={() => router.replace({ pathname: '/explore/[id]', params: { id } })} style={styles.linkButton}><Text style={styles.link}>← Motor details</Text></Pressable>
    <Text style={styles.title}>{saved ? 'Request received' : 'Plan your ride'}</Text>
    {saved ? <View style={styles.panel}><Text accessibilityRole="alert" style={styles.heading}>{saved === 'approved' ? 'You already have an approved booking for these dates.' : 'Your request is saved.'}</Text><Text style={styles.copy}>View its latest status in My Bookings. A pending request is not a confirmed reservation.</Text><SubmitButton title="VIEW MY BOOKINGS" onPress={() => router.navigate('/bookings')} /></View> : motor ? <>
      <View style={styles.panel}><Text style={styles.heading}>{motor.name}</Text><Text style={styles.copy}>{motor.type} · {dailyPrice(motor.price)} / day</Text></View>
      <Text style={styles.label}>Pickup date</Text><Input placeholder={`YYYY-MM-DD (e.g. ${manilaToday()})`} accessibilityLabel="Pickup date, YYYY-MM-DD" value={pickup} onChangeText={setPickup} autoCorrect={false} autoCapitalize="none" maxLength={10} editable={!busy} keyboardType="numbers-and-punctuation" />
      <Text style={styles.label}>Return date</Text><Input placeholder="YYYY-MM-DD" accessibilityLabel="Return date, YYYY-MM-DD" value={returned} onChangeText={setReturned} autoCorrect={false} autoCapitalize="none" maxLength={10} editable={!busy} keyboardType="numbers-and-punctuation" />
      <Text style={styles.copy}>Dates use Philippine time. The return date is not charged: pickup Nov 21 → return Nov 23 is 2 days. Rentals are 1–90 days; pickup can be up to 365 days ahead.</Text>
      {dateError && <Text accessibilityRole="alert" style={styles.error}>{dateError}</Text>}
      <View style={styles.panel}><Text style={styles.label}>Rental summary</Text><Text style={styles.copy}>{days ? `${days} ${days === 1 ? 'day' : 'days'} × ${dailyPrice(motor.price)}` : 'Enter valid dates to calculate your total.'}</Text><Text style={styles.total}>{days ? dailyPrice(Math.round(motor.price * 100) * days / 100) : '—'}</Text><Text style={styles.copy}>Admin approval is required. Pending requests do not reserve a motor. This step does not collect payment.</Text></View>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <SubmitButton title="SUBMIT BOOKING REQUEST" onPress={submit} isSubmitting={busy} />
    </> : <Text style={styles.copy}>This motor is no longer listed. Return to Explore and choose another ride.</Text>}
  </ScrollView></KeyboardAvoidingView></MainSafe>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, page: { padding: 24, gap: 16, maxWidth: 780, width: '100%', alignSelf: 'center' }, title: { color: '#183334', fontSize: 30, fontWeight: '800' }, panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 20, gap: 12 }, heading: { color: '#21484a', fontSize: 22, fontWeight: '800' }, label: { color: '#21484a', fontSize: 15, fontWeight: '700' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 23 }, total: { color: '#21484a', fontSize: 30, fontWeight: '800' }, error: { color: '#991b1b', fontSize: 14, lineHeight: 22 }, link: { color: '#21484a', fontSize: 15, fontWeight: '700' }, linkButton: { minHeight: 44, justifyContent: 'center' } });

import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useBookings } from '@/context/BookingContext';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import CatalogCard, { dailyPrice } from '@/components/catalog-card';
import BookingStatus from '@/components/booking-status';
import { homeBooking } from '@/services/booking-history';
import { manilaToday } from '@/services/bookings';
import { formatBookingDate } from '@/services/booking-calendar';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';
import AdminHomeScreen from './AdminHomeScreen';

export default function HomeScreen() {
  const { user } = useAuth();
  const { motors, loading, error, retry, refreshing, refresh, refreshError } = useMotorInventory();
  const { bookings, loading: bookingsLoading, error: bookingError, refresh: refreshBookings } = useBookings();
  useFocusEffect(useCallback(() => { refreshBookings(); }, [refreshBookings]));
  const today = manilaToday();
  const nextBooking = homeBooking(bookings, today);
  if (user?.role === 'admin') return <AdminHomeScreen />;
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing || bookingsLoading} onRefresh={() => { refresh(); refreshBookings(); }} tintColor="#21484a" />}>
    <View style={styles.header}><View style={styles.greeting}><Text style={styles.brand}>MOTORRENT</Text><Text style={styles.hello}>Hi, {user?.fullName.split(' ')[0] || 'there'}.</Text></View><Pressable onPress={() => router.navigate('/account')} accessibilityRole="button" accessibilityLabel="Open your account" style={styles.avatar}><Text style={styles.initial}>{user?.fullName.charAt(0).toUpperCase()}</Text></Pressable></View>
    {bookingError ? <View style={styles.notice}>
      <Text style={styles.section}>Let’s check your ride</Text><Text accessibilityRole="alert" style={styles.copy}>Your booking status could not be refreshed. Try again to see your latest ride.</Text>
      <SubmitButton title="RETRY BOOKING STATUS" onPress={refreshBookings} />
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.linkButton}><Text style={styles.link}>My Bookings →</Text></Pressable>
    </View> : nextBooking ? <View style={styles.rideCard}>
      <Text style={styles.rideEyebrow}>{nextBooking.status === 'in_use' ? 'YOUR CURRENT RIDE' : nextBooking.status === 'approved' ? nextBooking.pickup_date <= today ? 'YOUR SCHEDULED RIDE' : 'YOUR NEXT APPROVED RIDE' : 'YOUR LATEST REQUEST'}</Text>
      <BookingStatus booking={nextBooking} today={today} />
      <Text style={styles.rideTitle}>{nextBooking.motor_name}</Text>
      <View style={styles.dates}><View style={styles.dateColumn}><Text style={styles.dateLabel}>PICKUP</Text><Text style={styles.dateValue}>{formatBookingDate(nextBooking.pickup_date)}</Text></View><Text style={styles.dateArrow}>→</Text><View style={styles.dateColumn}><Text style={styles.dateLabel}>RETURN</Text><Text style={styles.dateValue}>{formatBookingDate(nextBooking.return_date)}</Text></View></View>
      <Text style={styles.rideTotal}>{dailyPrice(nextBooking.total_centavos / 100)} <Text style={styles.copy}>total rental</Text></Text>
      <Text style={styles.copy}>{nextBooking.status === 'in_use' ? nextBooking.return_date <= today ? 'Your motor is overdue and still recorded as in use. Please contact the rental shop about its return.' : 'Pickup recorded. Enjoy your ride, and check the scheduled return date.' : nextBooking.status === 'pending' ? 'Waiting for admin approval. Your motor is not reserved yet.' : nextBooking.pickup_date <= today ? 'Your approved rental dates are underway. See the details for your schedule.' : 'Your request is approved. Your ride is reserved for these dates.'}</Text>
      {bookingsLoading && <Text accessibilityLiveRegion="polite" style={styles.copy}>Refreshing booking status…</Text>}
      <SubmitButton title="VIEW BOOKING DETAILS →" onPress={() => router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: nextBooking.id } })} style={styles.rideButton} />
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.linkButton}><Text style={styles.link}>All my bookings →</Text></Pressable>
    </View> : bookingsLoading ? <View style={styles.notice}><ActivityIndicator color="#21484a" accessibilityLabel="Checking your next ride" /><Text style={styles.copy}>Checking your next ride…</Text></View> : <View style={styles.hero}><Text style={styles.eyebrow}>A RIDE FOR YOUR EVERYDAY</Text><Text style={styles.title}>Your next trip{ '\n' }starts here.</Text><Text style={styles.heroCopy}>Find a motor that fits your plans and your budget.</Text><SubmitButton title="BROWSE MOTORS  →" onPress={() => router.navigate('/explore')} style={styles.button} /></View>}
    <View style={styles.heading}><View><Text style={styles.section}>Explore the collection</Text><Text style={styles.copy}>A few rides to get you started.</Text></View><Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={styles.linkButton}><Text style={styles.link}>See all →</Text></Pressable></View>
    {loading ? <ActivityIndicator color="#21484a" accessibilityLabel="Loading motors" /> : error ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.copy}>{error}</Text><SubmitButton title="TRY AGAIN" onPress={retry} /></View> : motors.length ? motors.slice(0, 3).map(motor => <CatalogCard key={motor.id} motor={motor} />) : <View style={styles.notice}><Text style={styles.section}>More rides on the way</Text><Text style={styles.copy}>There are no motors listed yet. Pull down to check again.</Text></View>}
    {refreshError && <Text accessibilityRole="alert" style={styles.copy}>{refreshError}</Text>}
    <Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.linkButton}><Text style={styles.link}>View all my bookings →</Text></Pressable>
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  rideCard: { padding: 24, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: '#d8e0d2', backgroundColor: '#faf8f2' }, rideEyebrow: { color: '#687e6b', fontSize: 10, fontWeight: '800', letterSpacing: 1.6 }, rideTitle: { color: '#183334', fontSize: 27, fontWeight: '800' }, dates: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, backgroundColor: '#edf0e7', borderRadius: 14, padding: 16 }, dateColumn: { flex: 1, minWidth: 100, gap: 7 }, dateLabel: { color: '#7b887a', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, dateValue: { color: '#21484a', fontSize: 14, fontWeight: '700' }, dateArrow: { color: '#6b806b', fontSize: 19 }, rideTotal: { color: '#21484a', fontSize: 22, fontWeight: '800' }, rideButton: { borderRadius: 12 },
  page: { padding: 22, gap: 20, paddingBottom: 28, maxWidth: 780, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, greeting: { flex: 1 }, brand: { fontSize: 11, color: '#526e65', letterSpacing: 2, fontWeight: '800' }, hello: { fontSize: 24, color: '#183334', fontWeight: '800', marginTop: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e1e8df', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#21484a', fontSize: 19, fontWeight: '700' },
  hero: { backgroundColor: '#21484a', padding: 26, borderRadius: 24, gap: 15 }, eyebrow: { color: '#c6d8ba', fontSize: 10, letterSpacing: 1.7, fontWeight: '800' }, title: { fontSize: 36, lineHeight: 42, color: '#faf8ef', fontWeight: '800' }, heroCopy: { color: '#d6e0d7', fontSize: 15, lineHeight: 23 }, button: { backgroundColor: '#517257', borderRadius: 12 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }, section: { fontSize: 20, fontWeight: '800', color: '#183334' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 22, marginTop: 5 }, link: { color: '#21484a', fontSize: 14, fontWeight: '700' }, linkButton: { paddingVertical: 12, paddingHorizontal: 4, minHeight: 44 }, notice: { padding: 20, backgroundColor: '#e5eadd', borderRadius: 18, gap: 6 },
});

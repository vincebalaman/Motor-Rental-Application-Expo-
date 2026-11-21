import NotificationBell from '@/components/notification-bell';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import BookingStatus from '@/components/booking-status';
import { dailyPrice } from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useMotorInventory } from '@/context/MotorContext';
import { useBookingClock } from '@/hooks/use-booking-clock';
import { homeBooking } from '@/services/booking-history';
import { bookingIsOverdue, bookingScheduleLabel } from '@/services/booking-time';
import { manilaToday } from '@/services/bookings';
import AdminHomeScreen from './AdminHomeScreen';

export default function HomeScreen() {
  const clock = useBookingClock();
  const { user } = useAuth();
  const { motors, loading, error, retry, refreshing, refresh, refreshError } = useMotorInventory();
  const { bookings, loading: bookingsLoading, error: bookingError, refresh: refreshBookings } = useBookings();
  useFocusEffect(useCallback(() => { refreshBookings(); }, [refreshBookings]));
  const today = manilaToday(new Date(clock));
  const nextBooking = homeBooking(bookings, today, clock);
  const overdue = nextBooking ? bookingIsOverdue(nextBooking, today, clock) : false;
  const firstName = user?.fullName.trim().split(/\s+/)[0] || 'there';
  if (user?.role === 'admin') return <AdminHomeScreen />;
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing || bookingsLoading} onRefresh={() => { refresh(); refreshBookings(); }} tintColor="#21484a" />}>
    <View style={styles.header}>
      <View style={styles.greeting}><Text style={styles.brand}>MotorRent</Text><Text accessibilityRole="header" style={styles.hello}>Hello, {firstName}.</Text><Text style={styles.copy}>Where will you go today?</Text></View>
      <View style={styles.headerActions}><NotificationBell /><Pressable onPress={() => router.navigate('/account')} accessibilityRole="button" accessibilityLabel="Open your account" style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}><Text style={styles.initial}>{user?.fullName.trim().charAt(0).toUpperCase() || 'M'}</Text></Pressable></View>
    </View>
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>{nextBooking?.status === 'in_use' ? 'Your current ride' : 'Your next ride'}</Text><Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.textButton}><Text style={styles.link}>My bookings ↗</Text></Pressable></View>
      {bookingError ? <View style={styles.card}>
        <Text style={styles.cardTitle}>Unable to update your booking</Text><Text accessibilityRole="alert" style={styles.copy}>Refresh to check your latest ride.</Text><Pressable accessibilityRole="button" onPress={refreshBookings} style={styles.outlineButton}><Text style={styles.link}>Try again</Text></Pressable>
      </View> : nextBooking ? <View style={styles.card}>
        <BookingStatus booking={nextBooking} today={today} now={clock} />
        <Text style={styles.rideTitle}>{nextBooking.motor_name}</Text>
        <View style={styles.schedule}>
          <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.pickupMarker} /><View style={styles.timeline} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Pickup</Text><Text style={styles.scheduleValue}>{bookingScheduleLabel(nextBooking, 'pickup')}</Text></View></View>
          <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.returnMarker} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Return by</Text><Text style={[styles.scheduleValue, overdue && styles.warning]}>{bookingScheduleLabel(nextBooking, 'return')}</Text></View></View>
        </View>
        <Text style={[styles.caption, overdue && styles.warning]}>{nextBooking.status === 'pending' ? 'Awaiting approval. Your motor is not reserved yet.' : nextBooking.status === 'in_use' ? overdue ? 'Return overdue. Please contact the rental shop.' : 'Pickup recorded. Please return by the agreed time.' : 'Approved. Your ride is reserved for this schedule.'}</Text>
        {bookingsLoading && <Text accessibilityLiveRegion="polite" style={styles.caption}>Updating booking…</Text>}
        <View style={styles.cardFooter}>
          <View style={styles.priceGroup}><Text style={styles.label}>Base rental</Text><Text style={styles.price}>{dailyPrice(nextBooking.total_centavos / 100)}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`View booking details for ${nextBooking.motor_name}`} onPress={() => router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: nextBooking.id } })} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}><Text style={styles.link}>View details →</Text></Pressable>
        </View>
      </View> : bookingsLoading ? <View style={styles.loadingCard}><ActivityIndicator color="#21484a" accessibilityLabel="Checking your next ride" /><Text style={styles.copy}>Checking your next ride…</Text></View> : <View style={styles.card}><Text style={styles.cardTitle}>No upcoming rides</Text><Text style={styles.copy}>Find a motor you like and request your next ride.</Text></View>}
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>Browse motors</Text><Text style={styles.primaryArrow}>→</Text></Pressable>
    </View>
    <View style={styles.section}>
      <View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>From the collection</Text><Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={styles.textButton}><Text style={styles.link}>View all ↗</Text></Pressable></View>
      {loading ? <View style={styles.loadingCard}><ActivityIndicator color="#21484a" accessibilityLabel="Loading motors" /><Text style={styles.copy}>Loading motors…</Text></View> : error ? <View style={styles.card}><Text accessibilityRole="alert" style={styles.copy}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.outlineButton}><Text style={styles.link}>Try again</Text></Pressable></View> : motors.length ? <View style={styles.collection}>
        {motors.slice(0, 3).map((motor, index) => <Pressable key={motor.id} accessibilityRole="button" accessibilityLabel={`View ${motor.name}, ${dailyPrice(motor.price)} per day`} onPress={() => router.push({ pathname: '/explore/[id]', params: { id: motor.id } })} style={({ pressed }) => [styles.motorRow, index > 0 && styles.rowDivider, pressed && styles.pressed]}>
          <View style={styles.photo}>{motor.imageUrl ? <Image source={{ uri: motor.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`${motor.name} photo`} /> : <Text style={styles.photoPlaceholder}>No photo</Text>}</View>
          <View style={styles.motorCopy}><Text style={styles.motorType}>{motor.type}</Text><Text style={styles.motorName}>{motor.name}</Text><Text style={styles.motorPrice}>{dailyPrice(motor.price)}<Text style={styles.priceUnit}> / day</Text></Text></View><Text accessible={false} style={styles.rowArrow}>›</Text>
        </Pressable>)}
      </View> : <View style={styles.card}><Text style={styles.cardTitle}>More rides on the way</Text><Text style={styles.copy}>No motors are listed yet. Pull down to check again.</Text></View>}
      {refreshError && <Text accessibilityRole="alert" style={styles.warning}>{refreshError}</Text>}
    </View>
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  page: { padding: 24, paddingTop: 20, paddingBottom: 32, gap: 30, maxWidth: 720, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, greeting: { flex: 1, gap: 6 }, brand: { fontSize: 13, color: '#526663', fontWeight: '600', marginBottom: 4 }, hello: { fontSize: 28, color: '#1d2928', fontWeight: '700', letterSpacing: -0.7 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5ebe7', borderWidth: 1, borderColor: '#d6dfd9', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#21484a', fontSize: 18, fontWeight: '600' },
  section: { gap: 12 }, sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 }, sectionTitle: { fontSize: 17, fontWeight: '600', color: '#1d2928', letterSpacing: -0.3 },
  card: { padding: 20, gap: 14, borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', backgroundColor: '#fff' }, cardTitle: { fontSize: 19, fontWeight: '600', color: '#1d2928' }, rideTitle: { fontSize: 24, fontWeight: '600', color: '#1d2928', letterSpacing: -0.5 }, copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, caption: { color: '#5c6b67', fontSize: 12, lineHeight: 19 }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 },
  schedule: { paddingVertical: 2 }, scheduleRow: { flexDirection: 'row', gap: 12 }, markerColumn: { width: 12, alignItems: 'center', paddingTop: 5 }, pickupMarker: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#21484a', backgroundColor: '#fff' }, returnMarker: { width: 9, height: 9, borderRadius: 2, backgroundColor: '#21484a' }, timeline: { width: 1, flex: 1, minHeight: 34, backgroundColor: '#dce3dc', marginVertical: 5 }, scheduleCopy: { flex: 1, gap: 3, paddingBottom: 14 }, scheduleValue: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 16 }, priceGroup: { gap: 3 }, price: { color: '#1d2928', fontSize: 21, fontWeight: '600', letterSpacing: -0.4 },
  primaryButton: { minHeight: 54, borderRadius: 13, paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#21484a', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' }, primaryArrow: { color: '#fff', fontSize: 20 },
  outlineButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd' }, textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 2 }, link: { color: '#21484a', fontSize: 13, fontWeight: '600' },
  collection: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', overflow: 'hidden' }, motorRow: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center' }, rowDivider: { borderTopWidth: 1, borderTopColor: '#edf0e9' }, photo: { width: 82, height: 82, backgroundColor: '#eff2ec', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, photoPlaceholder: { color: '#65736e', fontSize: 11 }, motorCopy: { flex: 1, gap: 5 }, motorType: { color: '#65736e', fontSize: 11 }, motorName: { color: '#1d2928', fontSize: 16, fontWeight: '600' }, motorPrice: { color: '#21484a', fontSize: 14, fontWeight: '600' }, priceUnit: { color: '#65736e', fontSize: 12, fontWeight: '400' }, rowArrow: { color: '#65736e', fontSize: 24 },
  loadingCard: { padding: 24, gap: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de' }, warning: { color: '#9b3d29', fontSize: 13, lineHeight: 20 }, pressed: { opacity: 0.7 },
});

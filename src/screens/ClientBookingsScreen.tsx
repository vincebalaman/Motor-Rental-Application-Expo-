import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import BookingStatus from '@/components/booking-status';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { manilaToday } from '@/services/bookings';
import { formatBookingDate } from '@/services/booking-calendar';
import { type BookingSection, bookingsInSection } from '@/services/booking-history';

export default function ClientBookingsScreen() {
  const { user } = useAuth();
  const { bookings, loading, error, refresh } = useBookings();
  const [section, setSection] = useState<BookingSection>('upcoming');
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const today = manilaToday();
  const upcoming = bookingsInSection(bookings, 'upcoming', today);
  const history = bookingsInSection(bookings, 'history', today);
  const visible = section === 'upcoming' ? upcoming : history;
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  return <MainSafe><FlatList data={visible} keyExtractor={item => item.id} refreshing={loading} onRefresh={refresh} contentContainerStyle={styles.page}
    ListHeaderComponent={<View style={styles.header}>
      <Text style={styles.eyebrow}>YOUR RIDES, IN ONE PLACE</Text><Text style={styles.title}>My Bookings</Text>
      <Text style={styles.copy}>Track your requests, plan your next trip, and revisit past rides.</Text>
      <View style={styles.tabs}>{(['upcoming', 'history'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={[styles.tab, section === value && styles.selected]}><Text style={[styles.tabText, section === value && styles.selectedText]}>{value === 'upcoming' ? `Upcoming (${upcoming.length})` : `History (${history.length})`}</Text></Pressable>)}</View>
      <Text style={styles.hint}>{section === 'upcoming' ? 'Pending requests, approved rides, and motors currently in use.' : 'Completed rentals and closed or past requests. Only Completed confirms a recorded return.'}</Text>
      {error && <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><SubmitButton title="TRY AGAIN" onPress={refresh} /></View>}
    </View>}
    ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !error ? <View style={styles.panel}><Text style={styles.heading}>{section === 'upcoming' ? 'Your next ride starts here' : 'No history yet'}</Text><Text style={styles.copy}>{section === 'upcoming' ? 'Browse motors and choose your dates to send a booking request.' : 'Past and closed requests will appear here.'}</Text>{section === 'upcoming' && <SubmitButton title="EXPLORE MOTORS" onPress={() => router.navigate('/explore')} />}</View> : undefined}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`View booking for ${item.motor_name}, pickup ${formatBookingDate(item.pickup_date)}`} onPress={() => router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: item.id } })} style={({ pressed }) => [styles.panel, pressed && styles.pressed]}>
      <BookingStatus booking={item} today={today} /><Text style={styles.heading}>{item.motor_name}</Text>
      <Text style={styles.copy}>{formatBookingDate(item.pickup_date)} → {formatBookingDate(item.return_date)}</Text>
      <View style={styles.row}><Text style={styles.total}>{dailyPrice(item.total_centavos / 100)}</Text><Text style={styles.link}>View details →</Text></View>
    </Pressable>}
  /></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 22, gap: 18, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, header: { gap: 14 }, eyebrow: { color: '#687e6b', fontSize: 10, letterSpacing: 1.8, fontWeight: '800' }, title: { fontSize: 30, color: '#183334', fontWeight: '800' }, panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 22, gap: 14, borderWidth: 1, borderColor: '#e1e4d9' }, heading: { color: '#21484a', fontSize: 22, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 23 }, hint: { color: '#7b887f', fontSize: 12, lineHeight: 19 }, total: { color: '#21484a', fontSize: 23, fontWeight: '800' }, error: { color: '#991b1b', lineHeight: 22 }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, link: { color: '#21484a', fontWeight: '700', fontSize: 13 }, pressed: { opacity: 0.75 }, tabs: { flexDirection: 'row', padding: 5, borderRadius: 16, backgroundColor: '#e5eadd', gap: 6 }, tab: { flex: 1, minHeight: 46, padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: '#21484a' }, tabText: { color: '#526e65', fontSize: 14, fontWeight: '700' }, selectedText: { color: '#faf8f2' },
});

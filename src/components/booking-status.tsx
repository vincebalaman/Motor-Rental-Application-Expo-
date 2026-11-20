import { StyleSheet, Text, View } from 'react-native';
import { type Booking } from '@/services/bookings';
import { bookingStatusColors, bookingStatusText } from '@/services/booking-history';
export default function BookingStatus({ booking, today }: { booking: Booking; today: string }) {
  return <View style={styles.badge}><Text style={[styles.text, { color: bookingStatusColors[booking.status] }]}>{bookingStatusText(booking, today)}</Text></View>;
}
const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#edf0e7' }, text: { fontSize: 12, fontWeight: '800' } });

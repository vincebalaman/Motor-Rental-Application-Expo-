import { StyleSheet, Text, View } from 'react-native';
import { dailyPrice } from '@/components/catalog-card';
import type { Booking } from '@/services/bookings';
import { completedLateHours } from '@/services/booking-time';
export default function BookingCharges({ booking, returnPreview = false, now }: { booking: Booking; returnPreview?: boolean; now?: number }) {
  const completed = booking.status === 'completed';
  const timed = !!booking.scheduled_return_at;
  const hours = completed ? booking.late_hours ?? 0 : returnPreview ? completedLateHours(booking.scheduled_return_at, now) : 0;
  const late = completed ? booking.late_fee_centavos ?? 0 : hours * (booking.late_hour_rate_centavos ?? 0);
  const final = completed ? booking.final_total_centavos ?? booking.total_centavos : booking.total_centavos + late;
  return <View style={styles.panel}>
    <View style={styles.row}><Text style={styles.copy}>Base rental</Text><Text style={styles.amount}>{dailyPrice(booking.total_centavos / 100)}</Text></View>
    {(completed || returnPreview) && <>
      <View style={styles.row}><Text style={styles.copy}>Late fee · {hours} completed {hours === 1 ? 'hour' : 'hours'}</Text><Text style={styles.amount}>{dailyPrice(late / 100)}</Text></View>
      <View style={styles.row}><Text style={styles.amount}>{completed ? 'Final total' : 'Estimated return total'}</Text><Text style={styles.total}>{dailyPrice(final / 100)}</Text></View>
    </>}
    <Text style={styles.hint}>{timed ? `Late return: ${dailyPrice((booking.late_hour_rate_centavos ?? 20000) / 100)} per completed hour after the agreed return time. ${completed ? 'Calculated from the server-recorded return time.' : returnPreview ? 'Estimate only. The server calculates the final charge when you confirm return.' : 'Final charges are calculated when the admin records return.'}` : 'No pickup time was agreed for this older booking. No hourly late fee applies.'}</Text>
    <Text style={styles.hint}>Recording charges does not collect payment.</Text>
  </View>;
}
const styles = StyleSheet.create({ panel: { gap: 10 }, row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, copy: { color: '#687a75', fontSize: 14 }, amount: { color: '#21484a', fontSize: 15, fontWeight: '700' }, total: { color: '#21484a', fontSize: 24, fontWeight: '800' }, hint: { color: '#687a75', fontSize: 12, lineHeight: 19 } });

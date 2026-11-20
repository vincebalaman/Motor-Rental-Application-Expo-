import { Redirect, router } from 'expo-router';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { useBookingCart } from '@/context/BookingContext';
import type { Motor } from '@/services/inventory';
import { dailyPrice } from '@/components/catalog-card';

export default function BookingsScreen() {
  const { user } = useAuth();
  const { selectedMotors, removeMotor } = useBookingCart();
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;

  const dailyTotal = selectedMotors.reduce((total, motor) => total + motor.price, 0);

  return <MainSafe>
    <FlatList
      data={selectedMotors}
      keyExtractor={motor => motor.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR NEXT RIDE</Text>
        <Text style={styles.title}>My bookings</Text>
        <Text style={styles.copy}>Review your selected motorcycles and their daily rates.</Text>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Selected motorcycles</Text>
          <Text style={styles.count}>{selectedMotors.length}</Text>
        </View>
      </View>}
      renderItem={({ item }) => <BookingItem motor={item} onRemove={() => removeMotor(item.id)} />}
      ListEmptyComponent={<View style={styles.empty}>
        <Text style={styles.emptyIcon} accessibilityElementsHidden>▤</Text>
        <Text style={styles.emptyTitle}>Your booking list is empty</Text>
        <Text style={styles.copy}>Explore the motorcycles and add the rides you’re interested in. Your selection will show up here.</Text>
        <SubmitButton title="EXPLORE MOTORS" onPress={() => router.navigate('/explore')} />
      </View>}
      ListFooterComponent={selectedMotors.length > 0 ? <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Daily estimate</Text>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Combined daily rate</Text>
          <Text style={styles.total}>{dailyPrice(dailyTotal)}<Text style={styles.perDay}> / day</Text></Text>
        </View>
        <Text style={styles.summaryNote}>This is an estimate for one day. Rental dates and booking confirmation are not part of this selection yet.</Text>
        <SubmitButton title="CONTINUE EXPLORING" onPress={() => router.navigate('/explore')} style={styles.continueButton} />
      </View> : undefined}
    />
  </MainSafe>;
}

function BookingItem({ motor, onRemove }: { motor: Motor; onRemove: () => void }) {
  return <View style={styles.item}>
    <View style={styles.imageWrap}>
      {motor.imageUrl ? <Image source={{ uri: motor.imageUrl }} style={styles.image} contentFit="cover" accessibilityLabel={`${motor.name} image`} /> : <Text style={styles.imageFallback}>Photo unavailable</Text>}
    </View>
    <View style={styles.itemInfo}>
      <Text style={styles.type}>{motor.type}</Text>
      <Text style={styles.motorName}>{motor.name}</Text>
      <Text style={styles.price}>{dailyPrice(motor.price)}<Text style={styles.perDay}> / day</Text></Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${motor.name} from booking`}
        onPress={onRemove}
        style={styles.removeButton}
      >
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, padding: 22, paddingBottom: 32, gap: 18, maxWidth: 780, width: '100%', alignSelf: 'center' },
  header: { gap: 10, marginBottom: 2 },
  eyebrow: { color: '#526e65', fontSize: 10, letterSpacing: 1.8, fontWeight: '800' },
  title: { color: '#183334', fontSize: 32, fontWeight: '800' },
  copy: { color: '#687a75', fontSize: 14, lineHeight: 22 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  sectionTitle: { color: '#183334', fontSize: 19, fontWeight: '800' },
  count: { color: '#21484a', fontSize: 14, fontWeight: '800', backgroundColor: '#e2e9df', overflow: 'hidden', borderRadius: 16, paddingHorizontal: 11, paddingVertical: 5 },
  separator: { height: 12 },
  item: { flexDirection: 'row', gap: 14, borderRadius: 18, padding: 12, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9' },
  imageWrap: { width: 112, minHeight: 126, borderRadius: 12, overflow: 'hidden', backgroundColor: '#e2e9e3', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%', minHeight: 126 },
  imageFallback: { color: '#62736b', fontSize: 12, textAlign: 'center', padding: 8 },
  itemInfo: { flex: 1, justifyContent: 'center', gap: 5 },
  type: { color: '#687a75', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  motorName: { color: '#183334', fontSize: 18, fontWeight: '800' },
  price: { color: '#21484a', fontSize: 16, fontWeight: '800' },
  perDay: { color: '#687a75', fontSize: 12, fontWeight: '500' },
  removeButton: { alignSelf: 'flex-start', minHeight: 38, justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { color: '#8b3c32', fontSize: 13, fontWeight: '700' },
  empty: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 20, gap: 14, marginTop: 8 },
  emptyIcon: { color: '#517257', fontSize: 36 },
  emptyTitle: { color: '#21484a', fontSize: 22, fontWeight: '800' },
  summary: { backgroundColor: '#faf8f2', borderRadius: 20, padding: 20, gap: 14, marginTop: 8, borderWidth: 1, borderColor: '#e1e2d9' },
  summaryTitle: { color: '#183334', fontSize: 20, fontWeight: '800' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e1e2d9' },
  totalLabel: { color: '#687a75', fontSize: 14 },
  total: { color: '#21484a', fontSize: 21, fontWeight: '800' },
  summaryNote: { color: '#687a75', fontSize: 12, lineHeight: 19 },
  continueButton: { borderRadius: 12 },
});

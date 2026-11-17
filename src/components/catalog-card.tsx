import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Motor } from '@/services/inventory';

export function dailyPrice(price: number) {
  return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export default function CatalogCard({ motor }: { motor: Motor }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`View ${motor.name}, ${dailyPrice(motor.price)} per day`} onPress={() => router.push({ pathname: '/explore/[id]', params: { id: motor.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
    <View style={styles.photo}>
      {motor.imageUrl ? <Image source={{ uri: motor.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={motor.name} /> : <Text style={styles.placeholder}>Photo unavailable</Text>}
      <View style={styles.badge}><Text style={styles.badgeText}>{motor.type}</Text></View>
    </View>
    <View style={styles.content}>
      <Text style={styles.name}>{motor.name}</Text>
      <View style={styles.row}><Text style={styles.price}>{dailyPrice(motor.price)}<Text style={styles.unit}> / day</Text></Text><Text style={styles.arrow}>↗</Text></View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden', backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#e1e2d9' },
  photo: { height: 195, backgroundColor: '#e2e9e3', justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#62736b', fontSize: 14 }, badge: { position: 'absolute', left: 14, bottom: 14, backgroundColor: '#faf8f2', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#21484a', fontSize: 12, fontWeight: '700' }, content: { padding: 18, gap: 12 },
  name: { fontSize: 21, color: '#183334', fontWeight: '800' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: '#21484a', fontSize: 19, fontWeight: '800' }, unit: { color: '#6b7b76', fontSize: 13, fontWeight: '400' }, arrow: { fontSize: 24, color: '#21484a' },
});

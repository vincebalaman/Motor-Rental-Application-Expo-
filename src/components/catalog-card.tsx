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
      <View style={styles.row}><Text style={styles.price}>{dailyPrice(motor.price)}<Text style={styles.unit}> / day</Text></Text><Text accessible={false} style={styles.arrow}>↗</Text></View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de' },
  photo: { height: 180, backgroundColor: '#eff2ec', justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: '#65736e', fontSize: 14 }, badge: { position: 'absolute', left: 14, bottom: 14, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  badgeText: { color: '#21484a', fontSize: 11, fontWeight: '600' }, content: { padding: 18, gap: 12 },
  name: { fontSize: 20, color: '#1d2928', fontWeight: '600', letterSpacing: -0.4 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: '#21484a', fontSize: 18, fontWeight: '600' }, unit: { color: '#65736e', fontSize: 13, fontWeight: '400' }, arrow: { fontSize: 22, color: '#21484a' },
});

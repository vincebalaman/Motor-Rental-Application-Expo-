import { router, useLocalSearchParams } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import ProductCard from '@/components/productcard';
import { useMotorInventory } from '@/context/MotorContext';

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { motors, hiddenMotorIds, hideMotor } = useMotorInventory();
  const motor = motors.find((m) => m.id === Number(id));
  const isHidden = motor ? hiddenMotorIds.has(motor.id) : false;

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>← Explore</Text>
        </TouchableOpacity>

        {motor && !isHidden ? (
          <View style={styles.content}>
            <Text style={styles.eyebrow}>MOTOR DETAILS</Text>
            <ProductCard>
              <Image
                source={{ uri: motor.imageUrl }}
                style={styles.image}
                accessibilityLabel={`${motor.name} image`}
              />
              <View style={styles.cardContent}>
                <Text style={styles.type}>{motor.type}</Text>
                <Text style={styles.title}>{motor.name}</Text>
                <Text style={styles.price}>₱{motor.price} <Text style={styles.perDay}>/ day</Text></Text>
                <View style={styles.divider} />
                <Text style={styles.description}>{motor.description}</Text>
              </View>
            </ProductCard>

            <View style={styles.actions}>
              <Pressable
                style={styles.editButton}
                onPress={() =>
                  router.push({
                    pathname: '/(tabs)/explore/[id]/edit',
                    params: { id: String(motor.id) },
                  })
                }
                accessibilityRole="button"
              >
                <Text style={styles.editButtonText}>Edit motor</Text>
              </Pressable>
              <Pressable
                style={styles.hideButton}
                onPress={() => {
                  hideMotor(motor.id);
                  router.replace('/(tabs)/explore');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Hide ${motor.name}`}
                accessibilityHint="Removes this motor from the Explore list for this session."
              >
                <Text style={styles.hideButtonText}>Hide motor</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.notFound}>
            <Text style={styles.notFoundTitle}>Motor not available</Text>
            <Text style={styles.notFoundText}>This motor may have been hidden from Explore.</Text>
          </View>
        )}
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 32 },
  back: { color: '#21484a', fontSize: 16, fontWeight: '700' },
  content: { gap: 16, paddingTop: 28, paddingBottom: 24 },
  eyebrow: { color: '#21484a', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  image: { width: '100%', height: 240, borderRadius: 12, backgroundColor: '#1e293b' },
  cardContent: { paddingTop: 18 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 4 },
  type: { color: '#94a3b8', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  price: { color: '#93c5fd', fontSize: 22, fontWeight: '800', marginTop: 14 },
  perDay: { color: '#cbd5e1', fontSize: 15, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 18 },
  description: { color: '#cbd5e1', fontSize: 16, lineHeight: 25 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  editButton: { flex: 1, alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15 },
  editButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  hideButton: { flex: 1, alignItems: 'center', backgroundColor: '#7f1d1d', borderRadius: 12, paddingVertical: 15 },
  hideButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  notFoundTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  notFoundText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
});
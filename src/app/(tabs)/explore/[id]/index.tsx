import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { motors } from '@/database/motors';

export default function MotorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const motor = motors.find((m) => m.id === Number(id));

  return (
    <MainSafe>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>

        {motor ? (
          <View>
            <Text style={styles.title}>{motor.name}</Text>
            <Text style={styles.type}>{motor.type}</Text>
            <Text style={styles.price}>₱{motor.price} / day</Text>
            <Text style={styles.description}>{motor.description}</Text>
          </View>
        ) : (
          <Text style={styles.title}>Motor not found</Text>
        )}
      </View>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 64, gap: 24 },
  back: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '700' },
  type: { color: '#64748b', fontSize: 16, marginTop: 4 },
  price: { color: '#2563eb', fontSize: 20, fontWeight: '700', marginTop: 12 },
  description: { color: '#334155', fontSize: 16, lineHeight: 24, marginTop: 16 },
});
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import MainSafe from '@/components/mainsafe';
import { getMotors, MOTOR_TYPES, type Motor, type MotorType } from '../../database/motor';

export default function ExploreScreen() {
  const [motors, setMotors] = useState<Motor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<MotorType>('All');

  useEffect(() => {
    getMotors()
      .then(setMotors)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return motors.filter(
      (m) => (type === 'All' || m.type === type) && (q === '' || m.name.toLowerCase().includes(q)),
    );
  }, [motors, query, type]);

  const handleRent = (motor: Motor) => {
    Alert.alert('Coming soon', `Booking for ${motor.name} will be available soon.`);
  };

  return (
    <MainSafe>
      <View style={styles.container}>
        <View>
          <Text style={styles.eyebrow}>EXPLORE</Text>
          <Text style={styles.title}>Find your ride</Text>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search motors"
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {MOTOR_TYPES.map((t) => {
              const active = t === type;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator color="#2563eb" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.empty}>No motors match your search.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardIcon}>
                  <Text style={{ fontSize: 26 }}>🏍️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardMeta}>{item.type} · {item.transmission}</Text>
                  <Text style={styles.cardPrice}>
                    ₱{item.pricePerDay}
                    <Text style={styles.cardPer}> / day</Text>
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 10 }}>
                  <View style={[styles.badge, item.available ? styles.badgeOn : styles.badgeOff]}>
                    <Text style={[styles.badgeText, item.available ? styles.badgeTextOn : styles.badgeTextOff]}>
                      {item.available ? 'Available' : 'Booked'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    disabled={!item.available}
                    onPress={() => handleRent(item)}
                    style={[styles.rentButton, !item.available && { opacity: 0.4 }]}>
                    <Text style={styles.rentText}>Rent</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 48, gap: 16 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '700' },
  search: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#0f172a' },
  chipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center', marginTop: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  cardIcon: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cardName: { color: '#0f172a', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardMeta: { color: '#64748b', fontSize: 12, marginBottom: 6 },
  cardPrice: { color: '#2563eb', fontSize: 15, fontWeight: '700' },
  cardPer: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeOn: { backgroundColor: '#dcfce7' },
  badgeOff: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextOn: { color: '#16a34a' },
  badgeTextOff: { color: '#64748b' },
  rentButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  rentText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});

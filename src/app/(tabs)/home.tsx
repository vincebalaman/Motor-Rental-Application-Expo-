import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { getMotors, type Motor } from '../../database/motor';
import { useCurrentUser } from '../../hooks/use-current-user';

export default function HomeScreen() {
  const user = useCurrentUser();
  const [featured, setFeatured] = useState<Motor[]>([]);

  useEffect(() => {
    getMotors().then((motors) => setFeatured(motors.filter((m) => m.available).slice(0, 4)));
  }, []);

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>MOTORRENT DASHBOARD</Text>
            <Text style={styles.title}>Welcome, {user.fullName}</Text>
            <Text style={styles.subtitle}>Your next ride is ready to be discovered.</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/account')}>
            <Text style={styles.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Start your journey</Text>
          <Text style={styles.panelText}>Browse available motors and find a ride that fits your plans.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.navigate('/explore')}>
            <Text style={styles.primaryButtonText}>Explore Motors</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Available now</Text>
          <TouchableOpacity onPress={() => router.navigate('/explore')}>
            <Text style={styles.link}>See all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {featured.map((motor) => (
            <View key={motor.id} style={styles.card}>
              <Text style={styles.cardEmoji}>🏍️</Text>
              <Text style={styles.cardName} numberOfLines={1}>{motor.name}</Text>
              <Text style={styles.cardMeta}>{motor.type} · {motor.transmission}</Text>
              <Text style={styles.cardPrice}>₱{motor.pricePerDay}<Text style={styles.cardPer}> / day</Text></Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  container: { padding: 24, paddingTop: 48, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 16, lineHeight: 24 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#2563eb', fontSize: 18, fontWeight: '700' },
  panel: { backgroundColor: '#0f172a', borderRadius: 16, padding: 24 },
  panelTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  panelText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23, marginBottom: 24 },
  primaryButton: { alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -8 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
  link: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  card: { width: 170, backgroundColor: '#ffffff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardEmoji: { fontSize: 28, marginBottom: 12 },
  cardName: { color: '#0f172a', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  cardMeta: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  cardPrice: { color: '#2563eb', fontSize: 16, fontWeight: '700' },
  cardPer: { color: '#64748b', fontSize: 12, fontWeight: '500' },
});

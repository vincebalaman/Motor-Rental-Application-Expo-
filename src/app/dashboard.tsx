import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getCurrentUser, logoutUser, type AuthUser } from '@/database/auth';

export default function DashboardScreen() {
  const database = useSQLiteContext();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser(database).then((currentUser) => {
      if (!currentUser) {
        router.replace('/auth/login');
        return;
      }
      setUser(currentUser);
    });
  }, [database]);

  const handleLogout = async () => {
    await logoutUser(database);
    router.replace('/auth/login');
  };

  if (!user) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.eyebrow}>MOTORRENT DASHBOARD</Text>
        <Text style={styles.title}>Welcome, {user.fullName}</Text>
        <Text style={styles.subtitle}>Your next ride is ready to be discovered.</Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Start your journey</Text>
        <Text style={styles.panelText}>Browse available motors and find a ride that fits your plans.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/explore')}>
          <Text style={styles.primaryButtonText}>Explore Motors</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 24, paddingTop: 64 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 16, lineHeight: 24 },
  panel: { backgroundColor: '#0f172a', borderRadius: 16, padding: 24 },
  panelTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  panelText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23, marginBottom: 24 },
  primaryButton: { alignItems: 'center', backgroundColor: '#3b82f6', borderRadius: 10, paddingVertical: 14 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  logoutButton: { alignItems: 'center', paddingVertical: 14 },
  logoutText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});
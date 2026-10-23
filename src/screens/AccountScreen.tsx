import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';

export default function AccountScreen() {
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/auth/login');
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#21484a" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MOTORRENT</Text>
          <Text style={styles.title}>Your account</Text>
          <Text style={styles.subtitle}>Manage your profile and preferences.</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || '?'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>SIGNED IN AS</Text>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account settings</Text>
          <Link href="/auth/forgot-password" asChild>
            <Pressable style={styles.settingRow} accessibilityRole="button">
              <View style={styles.settingIcon}>
                <Text style={styles.settingIconText}>•</Text>
              </View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Reset password</Text>
                <Text style={styles.settingDescription}>Get help recovering your password</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <ActivityIndicator color="#991b1b" />
          ) : (
            <Text style={styles.logoutText}>Log out</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>Ride with confidence.</Text>
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3efe6' },
  container: { flexGrow: 1, padding: 24, paddingTop: 36, paddingBottom: 32 },
  header: { marginBottom: 26 },
  eyebrow: { color: '#21484a', fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 22, marginTop: 6 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 16,
    padding: 22,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#21484a',
    borderColor: '#527a77',
    borderRadius: 32,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: { color: '#ffffff', fontSize: 21, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  name: { color: '#ffffff', fontSize: 19, fontWeight: '700', marginTop: 5 },
  email: { color: '#cbd5e1', fontSize: 14, marginTop: 4 },
  section: { marginTop: 32 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  settingRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  settingIcon: {
    alignItems: 'center',
    backgroundColor: '#e7efed',
    borderRadius: 11,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  settingIconText: { color: '#21484a', fontSize: 25, fontWeight: '800', lineHeight: 28 },
  settingCopy: { flex: 1 },
  settingTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  settingDescription: { color: '#64748b', fontSize: 13, marginTop: 4 },
  chevron: { color: '#64748b', fontSize: 28, lineHeight: 30 },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: '#fff7f7',
    borderColor: '#fecaca',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 28,
    paddingVertical: 15,
  },
  logoutText: { color: '#991b1b', fontSize: 15, fontWeight: '700' },
  buttonPressed: { opacity: 0.75 },
  footer: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginTop: 24, textAlign: 'center' },
});

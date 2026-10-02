import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import { logoutUser } from '@/database/auth';
import { useCurrentUser } from '../../hooks/use-current-user';

export default function SettingsScreen() {
  const database = useSQLiteContext();
  const user = useCurrentUser();
  const [notifications, setNotifications] = useState(true);

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
    <MainSafe>
      <View style={styles.container}>
        <View>
          <Text style={styles.eyebrow}>SETTINGS</Text>
          <Text style={styles.title}>Your preferences</Text>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.fullName.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user.fullName}</Text>
            <Text style={styles.profileMeta}>MotorRent member</Text>
          </View>
        </View>

        <View style={styles.group}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/account')}>
            <Ionicons name="person-outline" size={20} color="#475569" />
            <Text style={styles.rowText}>Account</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Ionicons name="notifications-outline" size={20} color="#475569" />
            <Text style={styles.rowText}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: '#3b82f6', false: '#cbd5e1' }}
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.row}
            onPress={() => Alert.alert('About MotorRent', 'Version 1.0.0\nFind and rent motors with ease.')}>
            <Ionicons name="information-circle-outline" size={20} color="#475569" />
            <Text style={styles.rowText}>About</Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 24, paddingTop: 48, gap: 24 },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '700', letterSpacing: 1.4, marginBottom: 12 },
  title: { color: '#0f172a', fontSize: 30, fontWeight: '700' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#0f172a', borderRadius: 16, padding: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  profileName: { color: '#ffffff', fontSize: 18, fontWeight: '700', marginBottom: 2 },
  profileMeta: { color: '#cbd5e1', fontSize: 13 },
  group: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rowText: { flex: 1, color: '#0f172a', fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginLeft: 48 },
  logoutButton: { alignItems: 'center', paddingVertical: 14 },
  logoutText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
});

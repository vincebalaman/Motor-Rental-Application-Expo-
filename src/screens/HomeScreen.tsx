import { Redirect, router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>MOTORRENT DASHBOARD</Text>
          <Text style={styles.title}>Welcome back,</Text>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.subtitle}>
            Make the most of every trip. Find a motor that suits your plans, compare your options, and get ready to explore.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelEyebrow}>YOUR NEXT RIDE</Text>
          <Text style={styles.panelTitle}>Find the right ride for your day.</Text>
          <Text style={styles.panelText}>
            From quick trips around town to longer adventures, browse the available motors and choose one that fits your route and budget.
          </Text>
          <SubmitButton title="EXPLORE" onPress={() => router.navigate('/explore')} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>A simple way to get moving</Text>
          <Text style={styles.sectionIntro}>
            Your next ride is only a few steps away. Take a moment to explore the options and pick the motor that works for you.
          </Text>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>01</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>Browse the collection</Text>
              <Text style={styles.stepDescription}>
                See the available motors, their details, and daily prices in Explore.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>02</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>Compare your options</Text>
              <Text style={styles.stepDescription}>
                Open a motor to review its description and decide whether it suits your plans.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>03</Text>
            </View>
            <View style={styles.stepCopy}>
              <Text style={styles.stepTitle}>Get ready to ride</Text>
              <Text style={styles.stepDescription}>
                Choose a ride that fits your needs and enjoy the freedom of your next journey.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>A little planning goes a long way</Text>
          <Text style={styles.noteText}>
            Think about where you’re headed and what kind of ride will feel comfortable for the trip. A good match makes every mile better.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  container: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 32 },
  header: { marginBottom: 28 },
  eyebrow: { color: '#21484a', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 16 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '600' },
  name: { color: '#0f172a', fontSize: 34, fontWeight: '800', marginTop: 2 },
  subtitle: { color: '#64748b', fontSize: 16, lineHeight: 25, marginTop: 12 },
  panel: { backgroundColor: '#0f172a', borderRadius: 20, padding: 24 },
  panelEyebrow: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 10 },
  panelTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', lineHeight: 31, marginBottom: 10 },
  panelText: { color: '#cbd5e1', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  section: { marginTop: 34 },
  sectionTitle: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  sectionIntro: { color: '#64748b', fontSize: 15, lineHeight: 23, marginTop: 8, marginBottom: 20 },
  step: { alignItems: 'flex-start', flexDirection: 'row', gap: 14, marginBottom: 18 },
  stepNumber: {
    alignItems: 'center',
    backgroundColor: '#e2ebe8',
    borderRadius: 13,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  stepNumberText: { color: '#21484a', fontSize: 13, fontWeight: '800' },
  stepCopy: { flex: 1, paddingTop: 2 },
  stepTitle: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  stepDescription: { color: '#64748b', fontSize: 14, lineHeight: 21, marginTop: 4 },
  note: { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: 16, borderWidth: 1, marginTop: 12, padding: 20 },
  noteTitle: { color: '#21484a', fontSize: 16, fontWeight: '800' },
  noteText: { color: '#64748b', fontSize: 14, lineHeight: 22, marginTop: 7 },
  logoutButton: { alignItems: 'center', marginTop: 20, paddingVertical: 14 },
  logoutText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
});
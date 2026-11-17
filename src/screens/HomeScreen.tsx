import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import CatalogCard from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { useMotorInventory } from '@/context/MotorContext';
import AdminHomeScreen from './AdminHomeScreen';

export default function HomeScreen() {
  const { user } = useAuth();
  const { motors, loading, error, retry, refreshing, refresh, refreshError } = useMotorInventory();
  if (user?.role === 'admin') return <AdminHomeScreen />;
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#21484a" />}>
    <View style={styles.header}><View style={styles.greeting}><Text style={styles.brand}>MOTORRENT</Text><Text style={styles.hello}>Hi, {user?.fullName.split(' ')[0] || 'there'}.</Text></View><Pressable onPress={() => router.navigate('/account')} accessibilityRole="button" accessibilityLabel="Open your account" style={styles.avatar}><Text style={styles.initial}>{user?.fullName.charAt(0).toUpperCase()}</Text></Pressable></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>A RIDE FOR YOUR EVERYDAY</Text><Text style={styles.title}>Your next trip{ '\n' }starts here.</Text><Text style={styles.heroCopy}>Find a motor that fits your plans and your budget.</Text><SubmitButton title="BROWSE MOTORS  →" onPress={() => router.navigate('/explore')} style={styles.button} /></View>
    <View style={styles.heading}><View><Text style={styles.section}>Explore the collection</Text><Text style={styles.copy}>A few rides to get you started.</Text></View><Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={styles.linkButton}><Text style={styles.link}>See all →</Text></Pressable></View>
    {loading ? <ActivityIndicator color="#21484a" accessibilityLabel="Loading motors" /> : error ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.copy}>{error}</Text><SubmitButton title="TRY AGAIN" onPress={retry} /></View> : motors.length ? motors.slice(0, 3).map(motor => <CatalogCard key={motor.id} motor={motor} />) : <View style={styles.notice}><Text style={styles.section}>More rides on the way</Text><Text style={styles.copy}>There are no motors listed yet. Pull down to check again.</Text></View>}
    {refreshError && <Text accessibilityRole="alert" style={styles.copy}>{refreshError}</Text>}
    <View style={styles.notice}><Text style={styles.section}>Plan your next ride</Text><Text style={styles.copy}>Browse motor details and daily rates now. Booking requests and admin approvals are coming next.</Text><Pressable accessibilityRole="button" onPress={() => router.navigate('/bookings')} style={styles.linkButton}><Text style={styles.link}>My Bookings →</Text></Pressable></View>
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 22, gap: 20, paddingBottom: 28, maxWidth: 780, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, greeting: { flex: 1 }, brand: { fontSize: 11, color: '#526e65', letterSpacing: 2, fontWeight: '800' }, hello: { fontSize: 24, color: '#183334', fontWeight: '800', marginTop: 6 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e1e8df', alignItems: 'center', justifyContent: 'center' }, initial: { color: '#21484a', fontSize: 19, fontWeight: '700' },
  hero: { backgroundColor: '#21484a', padding: 26, borderRadius: 24, gap: 15 }, eyebrow: { color: '#c6d8ba', fontSize: 10, letterSpacing: 1.7, fontWeight: '800' }, title: { fontSize: 36, lineHeight: 42, color: '#faf8ef', fontWeight: '800' }, heroCopy: { color: '#d6e0d7', fontSize: 15, lineHeight: 23 }, button: { backgroundColor: '#517257', borderRadius: 12 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 }, section: { fontSize: 20, fontWeight: '800', color: '#183334' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 22, marginTop: 5 }, link: { color: '#21484a', fontSize: 14, fontWeight: '700' }, linkButton: { paddingVertical: 12, paddingHorizontal: 4, minHeight: 44 }, notice: { padding: 20, backgroundColor: '#e5eadd', borderRadius: 18, gap: 6 },
});

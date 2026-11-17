import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
export default function BookingsScreen() {
  const { user } = useAuth();
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  return <MainSafe><View style={styles.page}><Text style={styles.title}>My Bookings</Text><View style={styles.panel}><Text style={styles.icon} accessibilityElementsHidden>▤</Text><Text style={styles.heading}>Your rides, in one place</Text><Text style={styles.copy}>Booking requests are coming next. Once enabled, you’ll be able to track your requests and admin approvals here.</Text><SubmitButton title="EXPLORE MOTORS" onPress={() => router.navigate('/explore')} /></View></View></MainSafe>;
}
const styles = StyleSheet.create({ page: { padding: 24, gap: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, title: { fontSize: 30, color: '#183334', fontWeight: '800' }, panel: { padding: 24, backgroundColor: '#faf8f2', borderRadius: 24, gap: 18 }, icon: { color: '#517257', fontSize: 40 }, heading: { color: '#21484a', fontSize: 24, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 16, lineHeight: 25 } });

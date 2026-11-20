import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';

export default function AdminHomeScreen() {
  const { user } = useAuth();
  return <MainSafe><ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>MOTORRENT ADMIN</Text>
    <Text style={styles.title}>Welcome back,{ '\n' }{user?.fullName}.</Text>
    <Text style={styles.copy}>Manage client requests and keep your inventory up to date.</Text>
    <View style={styles.hero}><Text style={styles.heroTitle}>Keep your bookings moving.</Text><Text style={styles.heroCopy}>Review pending requests, check client details, and approve or reject bookings.</Text><SubmitButton title="MANAGE BOOKINGS" onPress={() => router.navigate('/admin-bookings')} style={styles.heroButton} /></View>
    <View style={styles.panel}><Text style={styles.heading}>Motor inventory</Text><Text style={styles.copy}>Add and edit motor listings, update daily rates, or import motors from this device.</Text><SubmitButton title="MANAGE MOTORS" onPress={() => router.navigate('/explore')} /></View>
    <View style={styles.note}><Text style={styles.heading}>Before approving</Text><Text style={styles.copy}>Check the client, motor, rental dates, and total. Only approval reserves a motor; overlapping approved bookings are blocked automatically.</Text></View>
    <SubmitButton title="ACCOUNT SETTINGS" onPress={() => router.navigate('/account')} />
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center', paddingBottom: 32 }, eyebrow: { color: '#526e65', fontSize: 11, fontWeight: '800', letterSpacing: 1.8 }, title: { color: '#183334', fontSize: 30, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 15, lineHeight: 24 }, hero: { padding: 26, gap: 16, backgroundColor: '#21484a', borderRadius: 24 }, heroTitle: { color: '#faf8f2', fontSize: 28, fontWeight: '800' }, heroCopy: { color: '#d6e0d7', fontSize: 15, lineHeight: 24 }, heroButton: { backgroundColor: '#517257', borderRadius: 12 }, panel: { backgroundColor: '#faf8f2', borderRadius: 20, padding: 22, gap: 14 }, heading: { color: '#21484a', fontSize: 21, fontWeight: '800' }, note: { backgroundColor: '#e5eadd', padding: 22, borderRadius: 20, gap: 12 },
});

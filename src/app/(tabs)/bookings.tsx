import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { bookingErrorMessage } from '@/services/bookings';
const labels = { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
const colors = { pending: '#825510', approved: '#21623c', rejected: '#991b1b', cancelled: '#687a75' };
export default function BookingsScreen() {
  const { user } = useAuth();
  const { bookings, loading, error, refresh, cancel } = useBookings();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const running = useRef(false);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  const cancelRequest = async (id: string) => {
    if (running.current) return;
    running.current = true; setBusy(id); setActionError(null);
    try { await cancel(id); setConfirm(null); }
    catch (cause) { setActionError(bookingErrorMessage(cause)); refresh(); }
    finally { running.current = false; setBusy(null); }
  };
  return <MainSafe><FlatList data={bookings} keyExtractor={item => item.id} refreshing={loading} onRefresh={refresh} contentContainerStyle={styles.page}
    ListHeaderComponent={<View style={styles.header}><Text style={styles.title}>My Bookings</Text><Text style={styles.copy}>Your requests and their latest approval status.</Text>{error && <View><Text accessibilityRole="alert" style={styles.error}>{error}</Text><SubmitButton title="TRY AGAIN" onPress={refresh} /></View>}{actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}</View>}
    ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !error ? <View style={styles.panel}><Text style={styles.heading}>Your next ride starts here</Text><Text style={styles.copy}>Choose a motor and send your first booking request.</Text><SubmitButton title="EXPLORE MOTORS" onPress={() => router.navigate('/explore')} /></View> : undefined}
    renderItem={({ item }) => <View style={styles.panel}><Text style={[styles.status, { color: colors[item.status] }]}>{labels[item.status]}</Text><Text style={styles.heading}>{item.motor_name}</Text><Text style={styles.copy}>Pickup: {item.pickup_date}{'\n'}Return: {item.return_date}</Text><Text style={styles.copy}>{dailyPrice(item.daily_rate_centavos / 100)} / day · {(Date.parse(item.return_date) - Date.parse(item.pickup_date)) / 86400000} days</Text><Text style={styles.total}>{dailyPrice(item.total_centavos / 100)}</Text><Text style={styles.reference}>Reference: {item.id}</Text>{item.status === 'pending' && <><Text style={styles.copy}>Awaiting admin approval. Your motor is not reserved yet.</Text>{confirm === item.id ? <View style={styles.confirm}><Text style={styles.copy}>Cancel this pending request?</Text><SubmitButton title="CONFIRM CANCELLATION" onPress={() => { void cancelRequest(item.id); }} isSubmitting={busy === item.id} /><Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => setConfirm(null)}><Text style={styles.link}>Keep request</Text></Pressable></View> : <Pressable accessibilityRole="button" disabled={!!busy} style={styles.linkButton} onPress={() => { setConfirm(item.id); setActionError(null); }}><Text style={styles.link}>Cancel request</Text></Pressable>}</>}</View>}
  /></MainSafe>;
}
const styles = StyleSheet.create({ page: { padding: 24, gap: 18, paddingBottom: 32, maxWidth: 780, width: '100%', alignSelf: 'center' }, header: { gap: 10 }, title: { fontSize: 30, color: '#183334', fontWeight: '800' }, panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 22, gap: 12 }, heading: { color: '#21484a', fontSize: 22, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 23 }, status: { fontSize: 13, fontWeight: '800' }, total: { color: '#21484a', fontSize: 24, fontWeight: '800' }, reference: { color: '#687a75', fontSize: 11 }, error: { color: '#991b1b', lineHeight: 22 }, confirm: { gap: 10, borderTopWidth: 1, borderColor: '#dddcd3', paddingTop: 12 }, linkButton: { minHeight: 44, justifyContent: 'center' }, link: { color: '#21484a', fontWeight: '700' } });

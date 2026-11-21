import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { type AdminSummary, createAdminDashboardService } from '@/services/admin-dashboard';
import { manilaToday } from '@/services/bookings';
import { formatBookingDate } from '@/services/booking-calendar';
const cards = [
  { key: 'pending', title: 'Pending requests', copy: 'Waiting for your review' },
  { key: 'pickups_today', title: 'Pickups today', copy: 'Approved, awaiting handover' },
  { key: 'returns_today', title: 'Returns due today', copy: 'Motors still out with clients' },
  { key: 'in_use', title: 'Currently in use', copy: 'All motors with a client' },
  { key: 'overdue', title: 'Overdue rentals', copy: 'Return date reached; still out' },
] as const;
export default function AdminHomeScreen() {
  const { user } = useAuth();
  const service = useMemo(() => createAdminDashboardService(getSupabaseClient()), []);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const focused = useRef(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!focused.current) return;
    const version = ++generation.current;
    setLoading(true); setError(null);
    try {
      const result = await service.summary();
      if (focused.current && version === generation.current) { setSummary(result); setUpdatedAt(new Date()); }
    } catch {
      if (focused.current && version === generation.current) setError('We could not refresh your dashboard. Please try again before relying on these counts.');
    } finally { if (focused.current && version === generation.current) setLoading(false); }
  }, [service]);
  useFocusEffect(useCallback(() => {
    focused.current = true; void refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { focused.current = false; subscription.remove(); };
  }, [refresh]));
  return <MainSafe><ScrollView contentContainerStyle={styles.page} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { void refresh(); }} tintColor="#21484a" />}>
    <View style={styles.header}><Text style={styles.eyebrow}>MOTORRENT ADMIN</Text><Text style={styles.title}>Your day at a glance.</Text><Text style={styles.copy}>Welcome back, {user?.fullName}.</Text></View>
    {summary && <View style={styles.dateRow}><Text style={styles.date}>{formatBookingDate(summary.today, true)} · PH</Text><Text style={styles.updated}>{loading ? 'Refreshing…' : error ? 'Last loaded counts' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}` : ''}</Text></View>}
    {error && <View style={styles.errorPanel}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><SubmitButton title="RETRY DASHBOARD" onPress={() => { void refresh(); }} /></View>}
    {loading && !summary && <View style={styles.status}><ActivityIndicator color="#21484a" accessibilityLabel="Loading admin dashboard" /><Text style={styles.copy}>Checking your booking activity…</Text></View>}
    {summary && <View style={styles.grid}>{cards.map(card => <Pressable key={card.key} accessibilityRole="button" accessibilityLabel={`${card.title}: ${summary[card.key]}. View bookings.`} onPress={() => router.navigate({ pathname: '/admin-bookings', params: { view: card.key, date: summary.today } })} style={({ pressed }) => [styles.card, card.key === 'overdue' && summary.overdue > 0 && styles.overdueCard, pressed && styles.pressed]}>
      <View style={styles.cardTop}><Text style={styles.cardLabel}>{card.title}</Text><Text style={styles.arrow} accessibilityElementsHidden>↗</Text></View>
      <Text style={[styles.count, card.key === 'overdue' && summary.overdue > 0 && styles.overdueText]}>{summary[card.key].toLocaleString('en-PH')}</Text><Text style={styles.small}>{card.copy}</Text>
    </Pressable>)}</View>}
    {summary && <Text style={styles.small}>Counts are remaining tasks, not completed handovers. Overdue includes motors due today that have not been returned. Pull down to refresh.</Text>}
    <View style={styles.panel}><Text style={styles.heading}>Manage your workspace</Text><SubmitButton title="ALL BOOKINGS" onPress={() => router.navigate({ pathname: '/admin-bookings', params: { view: 'all', date: summary?.today ?? manilaToday() } })} style={styles.button} /><SubmitButton title="MOTOR INVENTORY" onPress={() => router.navigate('/explore')} style={styles.secondaryButton} /><Pressable accessibilityRole="button" onPress={() => router.navigate('/account')} style={styles.accountLink}><Text style={styles.link}>Account settings →</Text></Pressable></View>
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({ page: { padding: 22, gap: 20, maxWidth: 850, width: '100%', alignSelf: 'center', paddingBottom: 32 }, header: { gap: 10 }, eyebrow: { color: '#526e65', fontSize: 10, letterSpacing: 1.8, fontWeight: '800' }, title: { color: '#183334', fontSize: 30, fontWeight: '800' }, copy: { color: '#687a75', fontSize: 14, lineHeight: 23 }, dateRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, date: { color: '#21484a', fontSize: 13, fontWeight: '700' }, updated: { color: '#85907e', fontSize: 11 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { flexGrow: 1, flexBasis: '45%', minWidth: 140, backgroundColor: '#faf8f2', borderWidth: 1, borderColor: '#dde2d5', borderRadius: 20, padding: 19, gap: 10 }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, cardLabel: { color: '#526e65', fontSize: 12, fontWeight: '700', flex: 1 }, arrow: { color: '#7d9178', fontSize: 20 }, count: { color: '#21484a', fontSize: 38, fontWeight: '800' }, small: { color: '#7b8876', fontSize: 12, lineHeight: 19 }, overdueCard: { backgroundColor: '#f3e8dc', borderColor: '#dec2aa' }, overdueText: { color: '#9a5144' }, pressed: { opacity: 0.72 }, panel: { padding: 22, borderRadius: 22, backgroundColor: '#e5eadd', gap: 12 }, heading: { color: '#21484a', fontSize: 21, fontWeight: '800' }, button: { borderRadius: 12 }, secondaryButton: { borderRadius: 12, backgroundColor: '#517257' }, accountLink: { minHeight: 44, justifyContent: 'center', alignItems: 'center' }, link: { color: '#21484a', fontWeight: '700', fontSize: 13 }, status: { padding: 30, alignItems: 'center', gap: 12 }, errorPanel: { padding: 20, gap: 12, backgroundColor: '#f3e8dc', borderRadius: 18 }, error: { color: '#991b1b', fontSize: 14, lineHeight: 22 } });

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
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
  { key: 'overdue', title: 'Overdue rentals', copy: 'Past scheduled return; still out' },
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
    <View style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>Admin overview</Text><Text accessibilityRole="header" style={styles.title}>Dashboard</Text><Text style={styles.copy}>Hello, {user?.fullName.trim().split(/\s+/)[0] || 'there'}.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open admin account settings" onPress={() => router.navigate('/account')} style={styles.avatar}><Text style={styles.avatarText}>{user?.fullName.trim().charAt(0).toUpperCase() || 'A'}</Text></Pressable></View>
    {summary && <View style={styles.dateRow}><Text style={styles.date}>{formatBookingDate(summary.today, true)} · PH</Text><Text style={styles.updated}>{loading ? 'Refreshing…' : error ? 'Last loaded counts' : updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' })}` : ''}</Text></View>}
    {error && <View style={styles.errorPanel}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { void refresh(); }} style={styles.outlineButton}><Text style={styles.link}>Try again</Text></Pressable></View>}
    {loading && !summary && <View style={styles.status}><ActivityIndicator color="#21484a" accessibilityLabel="Loading admin dashboard" /><Text style={styles.copy}>Checking your booking activity…</Text></View>}
    {summary && <Text accessibilityRole="header" style={styles.sectionTitle}>Booking activity</Text>}
    {summary && <View style={styles.grid}>{cards.map(card => <Pressable key={card.key} accessibilityRole="button" accessibilityLabel={`${card.title}: ${summary[card.key]}. View bookings.`} onPress={() => router.navigate({ pathname: '/admin-bookings', params: { view: card.key, date: summary.today } })} style={({ pressed }) => [styles.card, card.key === 'pending' && styles.pendingCard, card.key === 'overdue' && summary.overdue > 0 && styles.overdueCard, pressed && styles.pressed]}>
      <View style={styles.cardTop}><Text style={styles.cardLabel}>{card.title}</Text><Text style={styles.arrow} accessibilityElementsHidden>↗</Text></View>
      <Text style={[styles.count, card.key === 'overdue' && summary.overdue > 0 && styles.overdueText]}>{summary[card.key].toLocaleString('en-PH')}</Text><Text style={styles.small}>{card.copy}</Text>
    </Pressable>)}</View>}
    {summary && <Text style={styles.small}>Counts show outstanding work. Overdue rentals are still in use past their scheduled return. Pull down to refresh.</Text>}
    <View style={styles.workspace}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>Workspace</Text>
      <View style={styles.panel}>
        <Pressable accessibilityRole="button" onPress={() => router.navigate({ pathname: '/admin-bookings', params: { view: 'all', date: summary?.today ?? manilaToday() } })} style={({ pressed }) => [styles.workspaceRow, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={styles.rowTitle}>All bookings</Text><Text style={styles.small}>Review requests and manage rentals</Text></View><Text accessible={false} style={styles.arrow}>›</Text></Pressable>
        <View style={styles.divider} />
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={({ pressed }) => [styles.workspaceRow, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Motor inventory</Text><Text style={styles.small}>Browse, add, and update motors</Text></View><Text accessible={false} style={styles.arrow}>›</Text></Pressable>
        <View style={styles.divider} />
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/account')} style={({ pressed }) => [styles.workspaceRow, pressed && styles.pressed]}><View style={styles.rowCopy}><Text style={styles.rowTitle}>Account settings</Text><Text style={styles.small}>Profile and account security</Text></View><Text accessible={false} style={styles.arrow}>›</Text></Pressable>
      </View>
    </View>
  </ScrollView></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 20, gap: 16, maxWidth: 850, width: '100%', alignSelf: 'center', paddingBottom: 32 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 8 }, headerCopy: { flex: 1, gap: 6 }, eyebrow: { color: '#526663', fontSize: 12, fontWeight: '500', marginBottom: 4 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e5ebe7', borderWidth: 1, borderColor: '#d6dfd9', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#21484a', fontSize: 18, fontWeight: '600' },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 4 }, date: { color: '#273b37', fontSize: 13, fontWeight: '500' }, updated: { color: '#65736e', fontSize: 12 }, sectionTitle: { color: '#1d2928', fontSize: 17, fontWeight: '600', letterSpacing: -0.3 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { flexGrow: 1, flexBasis: '45%', minWidth: 140, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18, padding: 18, gap: 8 }, pendingCard: { flexBasis: '100%', borderLeftWidth: 3, borderLeftColor: '#21484a' }, cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, cardLabel: { color: '#526663', fontSize: 13, fontWeight: '500', flex: 1 }, arrow: { color: '#65736e', fontSize: 22 }, count: { color: '#1d2928', fontSize: 34, fontWeight: '600', letterSpacing: -1 }, small: { color: '#65736e', fontSize: 12, lineHeight: 19 }, overdueCard: { backgroundColor: '#fff7f3', borderColor: '#e7cec1' }, overdueText: { color: '#9b3d29' }, pressed: { opacity: 0.7 },
  workspace: { gap: 12, marginTop: 8 }, panel: { borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', overflow: 'hidden' }, workspaceRow: { minHeight: 76, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, rowCopy: { flex: 1, gap: 5 }, rowTitle: { color: '#273b37', fontSize: 14, fontWeight: '600' }, divider: { height: 1, backgroundColor: '#edf0e9', marginHorizontal: 18 }, link: { color: '#21484a', fontWeight: '600', fontSize: 13 }, outlineButton: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dfbca9', justifyContent: 'center', alignSelf: 'flex-start' }, status: { padding: 24, alignItems: 'center', gap: 12 }, errorPanel: { padding: 18, gap: 12, backgroundColor: '#fff7f3', borderRadius: 14, borderWidth: 1, borderColor: '#e7cec1' }, error: { color: '#9b3d29', fontSize: 14, lineHeight: 22 },
});

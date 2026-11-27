import { SymbolView } from 'expo-symbols';
import { useBookingClock } from '@/hooks/use-booking-clock';
import { bookingScheduleLabel } from '@/services/booking-time';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import BookingStatus from '@/components/booking-status';
import { dailyPrice } from '@/components/catalog-card';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { bookingErrorMessage, manilaToday } from '@/services/bookings';
import { type BookingSection, bookingsInSection, canRemoveBookingHistory } from '@/services/booking-history';

export default function ClientBookingsScreen() {
  const clock = useBookingClock();
  const { user } = useAuth();
  const { bookings, loading, error, refresh, hideHistory } = useBookings();
  const [section, setSection] = useState<BookingSection>('upcoming');
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const running = useRef(false);
  const removeHistory = async (id: string) => {
    if (running.current) return;
    running.current = true; setDeleting(id); setActionError(null);
    try { await hideHistory(id); setConfirmDelete(null); }
    catch (cause) { setActionError(bookingErrorMessage(cause)); }
    finally { running.current = false; setDeleting(null); }
  };
  const today = manilaToday(new Date(clock));
  const upcoming = bookingsInSection(bookings, 'upcoming', today, clock);
  const history = bookingsInSection(bookings, 'history', today, clock);
  const visible = section === 'upcoming' ? upcoming : history;
  if (user?.role !== 'client') return <Redirect href="/dashboard" />;
  return <MainSafe><FlatList data={visible} keyExtractor={item => item.id} refreshing={loading} onRefresh={refresh} contentContainerStyle={styles.page}
    ListHeaderComponent={<View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>My bookings</Text>
      <Text style={styles.copy}>Your upcoming rides and past rentals.</Text>
      <View accessibilityRole="tablist" style={styles.tabs}>{(['upcoming', 'history'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: section === value }} onPress={() => setSection(value)} style={[styles.tab, section === value && styles.selected]}><Text style={[styles.tabText, section === value && styles.selectedText]}>{value === 'upcoming' ? 'Upcoming' : 'History'}</Text><View style={[styles.count, section === value && styles.selectedCount]}><Text style={[styles.countText, section === value && styles.selectedText]}>{value === 'upcoming' ? upcoming.length : history.length}</Text></View></Pressable>)}</View>
      <Text style={styles.hint}>{section === 'upcoming' ? 'Requests, approved rides, and active rentals.' : 'Past requests and rentals. Completed means return confirmed.'}</Text>
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
      {error && <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={refresh} style={styles.outlineButton}><Text style={styles.link}>Try again</Text></Pressable></View>}
    </View>}
    ListEmptyComponent={loading ? <ActivityIndicator color="#21484a" /> : !error ? <View style={styles.panel}><Text style={styles.heading}>{section === 'upcoming' ? 'No upcoming rides' : 'No history yet'}</Text><Text style={styles.copy}>{section === 'upcoming' ? 'Choose a motor and plan your next ride.' : 'Past and closed requests will appear here.'}</Text>{section === 'upcoming' && <Pressable accessibilityRole="button" onPress={() => router.navigate('/explore')} style={styles.primaryButton}><Text style={styles.primaryText}>Browse motors →</Text></Pressable>}</View> : undefined}
    renderItem={({ item }) => <View style={styles.panel}><Pressable disabled={!!deleting} accessibilityRole="button" accessibilityLabel={`View booking for ${item.motor_name}, pickup ${bookingScheduleLabel(item, 'pickup')}`} onPress={() => router.push({ pathname: '/bookings/[bookingId]', params: { bookingId: item.id } })} style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}>
      <BookingStatus booking={item} today={today} now={clock} /><Text style={styles.heading}>{item.motor_name}</Text>
      <View style={styles.schedule}>
        <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.pickupMarker} /><View style={styles.timeline} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Pickup</Text><Text style={styles.scheduleValue}>{bookingScheduleLabel(item, 'pickup')}</Text></View></View>
        <View style={styles.scheduleRow}><View style={styles.markerColumn}><View style={styles.returnMarker} /></View><View style={styles.scheduleCopy}><Text style={styles.label}>Return by</Text><Text style={styles.scheduleValue}>{bookingScheduleLabel(item, 'return')}</Text></View></View>
      </View>
      <View style={styles.row}><View style={styles.priceGroup}><Text style={styles.label}>{item.status === 'completed' ? 'Final total' : 'Base rental'}</Text><Text style={styles.total}>{dailyPrice((item.status === 'completed' ? item.final_total_centavos ?? item.total_centavos : item.total_centavos) / 100)}</Text></View><View style={styles.detailAction}><Text style={styles.link}>View details →</Text></View></View>
    </Pressable>
      {section === 'history' && canRemoveBookingHistory(item) && <View style={styles.deleteRow}>
        {confirmDelete === item.id ? <>
          <Text style={styles.hint}>Remove this booking from your history? The rental shop keeps the booking and payment records.</Text>
          <Pressable accessibilityRole="button" disabled={!!deleting} accessibilityState={{ disabled: !!deleting, busy: deleting === item.id }} onPress={() => void removeHistory(item.id)} style={styles.deleteButton}>{deleting === item.id ? <ActivityIndicator color="#9b3d29" /> : <Text style={styles.deleteText}>Confirm delete</Text>}</Pressable>
          <Pressable accessibilityRole="button" disabled={!!deleting} onPress={() => setConfirmDelete(null)} style={styles.outlineButton}><Text style={styles.link}>Keep</Text></Pressable>
        </> : <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.motor_name} from history`} disabled={!!deleting} onPress={() => { setConfirmDelete(item.id); setActionError(null); }} style={styles.deleteButton}><SymbolView name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} size={18} tintColor="#9b3d29" accessible={false} /><Text style={styles.deleteText}>Delete from history</Text></Pressable>}
      </View>}
      {section === 'history' && !canRemoveBookingHistory(item) && <Text style={styles.hint}>This request is still open. Resolve it before removing it from history.</Text>}
    </View>}
  /></MainSafe>;
}
const styles = StyleSheet.create({
  page: { padding: 24, paddingTop: 20, gap: 16, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', flexGrow: 1 },
  header: { gap: 12, paddingBottom: 6 }, title: { fontSize: 28, color: '#1d2928', fontWeight: '700', letterSpacing: -0.7 },
  cardContent: { gap: 14 }, deleteRow: { borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 10, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 12 }, deleteButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, deleteText: { color: '#9b3d29', fontSize: 12, fontWeight: '500' },
  panel: { padding: 20, backgroundColor: '#fff', borderRadius: 18, gap: 14, borderWidth: 1, borderColor: '#e2e5de' }, heading: { color: '#1d2928', fontSize: 21, fontWeight: '600', letterSpacing: -0.4 },
  copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, hint: { color: '#65736e', fontSize: 12, lineHeight: 19 }, label: { color: '#65736e', fontSize: 12, lineHeight: 18 }, total: { color: '#1d2928', fontSize: 21, fontWeight: '600', letterSpacing: -0.4 }, error: { color: '#9b3d29', lineHeight: 22 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 16 }, priceGroup: { gap: 3 }, link: { color: '#21484a', fontWeight: '600', fontSize: 13 }, pressed: { opacity: 0.7 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', padding: 4, borderRadius: 13, backgroundColor: '#e7ebe4', gap: 4, marginTop: 8 }, tab: { flex: 1, minWidth: 125, minHeight: 48, flexDirection: 'row', gap: 8, padding: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: '#21484a' }, tabText: { color: '#526663', fontSize: 14, fontWeight: '600' }, selectedText: { color: '#fff' }, count: { minWidth: 24, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: '#dce3d9', alignItems: 'center' }, selectedCount: { backgroundColor: '#ffffff20' }, countText: { fontSize: 11, fontWeight: '600', color: '#526663' },
  schedule: { paddingTop: 2 }, scheduleRow: { flexDirection: 'row', gap: 12 }, markerColumn: { width: 12, alignItems: 'center', paddingTop: 5 }, pickupMarker: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: '#21484a', backgroundColor: '#fff' }, returnMarker: { width: 9, height: 9, borderRadius: 2, backgroundColor: '#21484a' }, timeline: { width: 1, flex: 1, minHeight: 30, backgroundColor: '#dce3dc', marginVertical: 5 }, scheduleCopy: { flex: 1, gap: 3, paddingBottom: 12 }, scheduleValue: { color: '#273b37', fontSize: 14, lineHeight: 22, fontWeight: '500' },
  detailAction: { minHeight: 44, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd' }, outlineButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#dce4dd' }, primaryButton: { minHeight: 52, borderRadius: 13, paddingVertical: 15, paddingHorizontal: 20, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

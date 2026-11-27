import { SymbolView } from 'expo-symbols';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import MainSafe from '@/components/mainsafe';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { type AppNotification, notificationDestination, notificationErrorMessage } from '@/services/notifications';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { items, unread, loading, loadingMore, hasMore, error, mutating, refresh, loadMore, markRead, markAllRead, remove } = useNotifications();
  const [opening, setOpening] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const running = useRef(false);
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; void refresh(); return () => { focused.current = false; }; }, [refresh]));
  const open = async (item: AppNotification) => {
    if (!user || running.current || mutating) return;
    running.current = true; setOpening(item.id); setActionError(null);
    try {
      const destination = notificationDestination(item,user.role);
      if (!item.read_at) await markRead(item.id);
      if (focused.current) router.push(destination);
    } catch (cause) { setActionError(notificationErrorMessage(cause)); }
    finally { running.current = false; setOpening(null); }
  };
  const deleteItem = async (id: string) => {
    if (running.current || mutating) return;
    running.current = true; setDeleting(id); setActionError(null);
    try { await remove(id); if (focused.current) setConfirmDelete(null); }
    catch (cause) { if (focused.current) setActionError(notificationErrorMessage(cause)); }
    finally { running.current = false; if (focused.current) setDeleting(null); }
  };
  if (!user) return <Redirect href="/auth/login" />;
  return <MainSafe><FlatList data={items} keyExtractor={item => item.id} refreshing={loading} onRefresh={() => { void refresh(); }} contentContainerStyle={styles.page}
    ListHeaderComponent={<View style={styles.header}>
      <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={styles.textButton}><Text style={styles.link}>← Back</Text></Pressable>
      <Text accessibilityRole="header" style={styles.title}>Notifications</Text>
      <View style={styles.headerRow}><Text accessibilityLiveRegion="polite" style={styles.copy}>{unread ? `${unread} unread ${unread === 1 ? 'update' : 'updates'}` : 'Your booking updates'}</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled: !unread || mutating, busy: mutating }} disabled={!unread || mutating} onPress={() => { setActionError(null); void markAllRead().catch(cause => setActionError(notificationErrorMessage(cause))); }} style={[styles.textButton, (!unread || mutating) && styles.disabled]}>{mutating && !opening && !deleting ? <ActivityIndicator color="#21484a" /> : <Text style={styles.link}>Mark all read</Text>}</Pressable></View>
      <Text style={styles.caption}>In-app alerts refresh while you use the app. Tap an update to view the current booking.</Text>
      {(error || actionError) && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{actionError || error}</Text><Pressable accessibilityRole="button" onPress={() => { setActionError(null); void refresh(); }} style={styles.textButton}><Text style={styles.link}>Try again</Text></Pressable></View>}
    </View>}
    ListEmptyComponent={loading ? <View style={styles.empty}><ActivityIndicator color="#21484a" accessibilityLabel="Loading notifications" /></View> : !error ? <View style={styles.empty}><Text style={styles.heading}>You’re all caught up</Text><Text style={styles.copy}>Booking decisions and upcoming ride reminders will appear here.</Text></View> : undefined}
    renderItem={({ item }) => <View style={[styles.card, !item.read_at && styles.unreadCard]}><Pressable accessibilityRole="button" accessibilityLabel={`${item.read_at ? 'Read' : 'Unread'}: ${item.title}. ${item.body}`} disabled={!!opening || !!deleting || mutating} onPress={() => { void open(item); }} style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}>
      <View style={styles.row}><Text style={[styles.heading, !item.read_at && styles.unreadTitle]}>{item.title}</Text>{opening === item.id ? <ActivityIndicator color="#21484a" /> : !item.read_at ? <View style={styles.dot} /> : null}</View>
      <Text style={styles.copy}>{item.body}</Text>
      <View style={styles.row}><Text style={styles.caption}>{new Date(item.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} PHT</Text><Text style={styles.link}>View booking →</Text></View>
    </Pressable>
      <View style={styles.deleteRow}>
        {confirmDelete === item.id ? <>
          <Text style={styles.caption}>Delete this notification? Your booking stays unchanged.</Text>
          <Pressable accessibilityRole="button" disabled={mutating || !!opening || !!deleting} accessibilityState={{ busy: deleting === item.id, disabled: mutating || !!opening || !!deleting }} onPress={() => void deleteItem(item.id)} style={styles.deleteButton}>{deleting === item.id ? <ActivityIndicator color="#9b3d29" /> : <Text style={styles.error}>Confirm delete</Text>}</Pressable>
          <Pressable accessibilityRole="button" disabled={mutating || !!deleting} onPress={() => setConfirmDelete(null)} style={styles.textButton}><Text style={styles.link}>Keep</Text></Pressable>
        </> : <Pressable accessibilityRole="button" accessibilityLabel={`Delete notification: ${item.title}`} disabled={mutating || !!opening || !!deleting} onPress={() => { setConfirmDelete(item.id); setActionError(null); }} style={styles.deleteButton}><SymbolView name={{ ios: 'trash', android: 'delete_outline', web: 'delete_outline' }} tintColor="#9b3d29" size={18} accessible={false} /><Text style={styles.deleteText}>Delete</Text></Pressable>}
      </View>
    </View>}
    ListFooterComponent={hasMore ? <Pressable accessibilityRole="button" disabled={loading || loadingMore || mutating} onPress={() => { void loadMore(); }} style={styles.more}>{loadingMore ? <ActivityIndicator color="#21484a" /> : <Text style={styles.link}>Load more updates</Text>}</Pressable> : undefined}
  /></MainSafe>;
}
const styles = StyleSheet.create({ page: { padding: 24, paddingTop: 12, paddingBottom: 32, maxWidth: 720, width: '100%', alignSelf: 'center', gap: 12, flexGrow: 1 }, header: { gap: 10, paddingBottom: 6 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, headerRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, textButton: { minHeight: 44, justifyContent: 'center', paddingVertical: 10 }, link: { color: '#21484a', fontSize: 13, fontWeight: '600' }, copy: { color: '#5c6b67', fontSize: 14, lineHeight: 22 }, caption: { color: '#65736e', fontSize: 12, lineHeight: 19 }, cardContent: { gap: 12 }, deleteRow: { borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 14 }, deleteButton: { minHeight: 44, minWidth: 44, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, deleteText: { color: '#9b3d29', fontSize: 12, fontWeight: '500' }, card: { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', padding: 18, gap: 12 }, unreadCard: { borderLeftWidth: 3, borderLeftColor: '#21484a' }, heading: { color: '#273b37', fontSize: 16, fontWeight: '500', flexShrink: 1 }, unreadTitle: { color: '#1d2928', fontWeight: '600' }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#21484a' }, empty: { padding: 24, gap: 12, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de' }, notice: { padding: 16, gap: 8, borderRadius: 14, backgroundColor: '#fff7f3' }, error: { color: '#9b3d29', fontSize: 14, lineHeight: 22 }, more: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 14 }, disabled: { opacity: 0.4 }, pressed: { opacity: 0.7 } });

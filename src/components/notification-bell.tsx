import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '@/context/NotificationContext';
export default function NotificationBell() {
  const { unread, error } = useNotifications();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ''}${error ? ', updates unavailable' : ''}`} onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <SymbolView name={{ ios: 'bell', android: 'notifications_none', web: 'notifications_none' }} size={23} tintColor="#21484a" accessible={false} />
    {unread > 0 && <View style={styles.badge}><Text style={styles.count}>{unread > 99 ? '99+' : unread}</Text></View>}
    {error && !unread && <View style={styles.warning} />}
  </Pressable>;
}
const styles = StyleSheet.create({ button: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de' }, badge: { position: 'absolute', top: -3, right: -5, minWidth: 19, minHeight: 19, paddingHorizontal: 4, borderRadius: 10, backgroundColor: '#21484a', alignItems: 'center', justifyContent: 'center' }, count: { color: '#fff', fontSize: 10, fontWeight: '600' }, warning: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: '#a66a1e' }, pressed: { opacity: 0.7 } });

import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingProvider } from '@/context/BookingContext';
import { MotorProvider } from '@/context/MotorContext';
import { useAuth } from '@/context/AuthContext';

function TabIcon({ name, color, focused }: { name: SymbolViewProps['name']; color: SymbolViewProps['tintColor'] | null; focused: boolean }) {
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.icon, focused && styles.activeIcon]}>
    <SymbolView name={name} tintColor={color ?? '#65736e'} size={22} weight="regular" accessible={false} />
  </View>;
}

export default function TabsLayout() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);
  return (
    <MotorProvider><BookingProvider key={user?.id}><Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#21484a',
        tabBarInactiveTintColor: '#65736e',
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
        tabBarStyle: [styles.bar, { height: 60 + bottomPadding, paddingBottom: bottomPadding }],
        tabBarItemStyle: styles.item,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="dashboard" options={{
        title: 'Home',
        tabBarAccessibilityLabel: 'Home',
        tabBarIcon: ({ color, focused }) => <TabIcon name={{ ios: 'house', android: 'home', web: 'home' }} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="explore" options={{
        title: 'Explore',
        tabBarAccessibilityLabel: 'Explore motors',
        tabBarIcon: ({ color, focused }) => <TabIcon name={{ ios: 'safari', android: 'explore', web: 'explore' }} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="admin-bookings" options={{
        title: 'Bookings',
        href: user?.role === 'admin' ? undefined : null,
        tabBarAccessibilityLabel: 'Manage bookings',
        tabBarIcon: ({ color, focused }) => <TabIcon name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="bookings" options={{
        title: 'My bookings',
        href: user?.role === 'client' ? undefined : null,
        tabBarAccessibilityLabel: 'My bookings',
        tabBarIcon: ({ color, focused }) => <TabIcon name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} color={color} focused={focused} />,
      }} />
      <Tabs.Screen name="account" options={{
        title: 'Account',
        tabBarAccessibilityLabel: 'Account settings',
        tabBarIcon: ({ color, focused }) => <TabIcon name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} color={color} focused={focused} />,
      }} />
    </Tabs></BookingProvider></MotorProvider>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e5de', paddingTop: 4, elevation: 0, shadowOpacity: 0 },
  item: { minHeight: 48, paddingVertical: 3 },
  icon: { width: 44, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { backgroundColor: '#edf2e9' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
});

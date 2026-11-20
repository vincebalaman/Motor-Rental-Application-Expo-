import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { BookingProvider } from '@/context/BookingContext';
import { MotorProvider } from '@/context/MotorContext';
import { BookingProvider } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { user } = useAuth();
  return (
    <MotorProvider><BookingProvider key={user?.id}><Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#21484a',
        tabBarInactiveTintColor: '#7b8785',
        tabBarStyle: { backgroundColor: '#faf8f2', borderTopColor: '#dddcd3' },
        tabBarLabelStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>⌂</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>◎</Text>
          ),
        }}
      />
      <Tabs.Screen name="admin-bookings" options={{ title: 'Bookings', href: user?.role === 'admin' ? undefined : null, tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>▤</Text> }} />
      <Tabs.Screen name="bookings" options={{ title: 'My Bookings', href: user?.role === 'client' ? undefined : null, tabBarIcon: ({ color, size }) => <Text style={{ color, fontSize: size }}>▤</Text> }} />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>👤</Text>
          ),
        }}
      />
    </Tabs></BookingProvider></MotorProvider>
  );
}
import { Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
export default function ClientBookingsLayout() {
  const { user } = useAuth();
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Protected guard={user?.role === 'client'} redirectTo="/dashboard">
      <Stack.Screen name="index" />
      <Stack.Screen name="[bookingId]" />
    </Stack.Protected>
  </Stack>;
}

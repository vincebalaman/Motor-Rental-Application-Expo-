import { Stack } from 'expo-router';

import { useAuth } from '@/context/AuthContext';

export default function MotorLayout() {
  const { user } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={user?.role === 'admin'} redirectTo="/explore">
        <Stack.Screen name="create" />
        <Stack.Screen name="edit" />
      </Stack.Protected>
    </Stack>
  );
}

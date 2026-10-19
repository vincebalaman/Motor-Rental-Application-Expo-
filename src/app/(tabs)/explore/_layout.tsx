import { Stack } from 'expo-router';

import { MotorProvider } from '@/context/MotorContext';

export default function ExploreLayout() {
  return (
    <MotorProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[id]" />
      </Stack>
    </MotorProvider>
  );
}
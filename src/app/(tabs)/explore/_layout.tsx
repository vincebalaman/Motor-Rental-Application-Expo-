import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useMotorInventory } from '@/context/MotorContext';

function InventoryNavigator() {
  const { loading, error, retry } = useMotorInventory();
  if (loading || error) {
    return (
      <MainSafe>
        <View style={styles.status}>
          {loading ? <ActivityIndicator color="#21484a" accessibilityLabel="Loading motors" /> : (
            <>
              <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              <SubmitButton title="TRY AGAIN" onPress={retry} />
            </>
          )}
        </View>
      </MainSafe>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      {/* Legacy import is retired; keep its code for recovery without exposing the route. */}
      <Stack.Protected guard={false} redirectTo="/explore">
        <Stack.Screen name="import" />
      </Stack.Protected>
    </Stack>
  );
}

export default function ExploreLayout() {
  return <InventoryNavigator />;
}

const styles = StyleSheet.create({
  status: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  error: { color: '#991b1b', fontSize: 16, textAlign: 'center' },
});

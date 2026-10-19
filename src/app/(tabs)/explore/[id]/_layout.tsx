import { motors } from '@/database/motors';
import { Stack } from 'expo-router';
import { useState } from 'react';

export default function MotorLayout() {
  const [products, setProducts] = useState([motors]);
  const ProducContext = React.createContext();
  return (
    <ProducContext.Provider value={{}}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="edit" />
      </Stack>
    </ProducContext.Provider>
  );
}

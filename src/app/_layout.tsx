import { Slot } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="motor_rent.db">
      <Slot />
    </SQLiteProvider>
  );
}

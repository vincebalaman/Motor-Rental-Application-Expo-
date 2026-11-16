import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import { SQLiteProvider, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initializeDatabase } from '@/database';

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { user, loading, sessionError, retrySession } = useAuth();

  if (loading || sessionError) {
    return (
      <MainSafe>
        <View style={styles.sessionStatus}>
          {loading ? (
            <ActivityIndicator color="#21484a" accessibilityLabel="Restoring your session" />
          ) : (
            <>
              <Text style={styles.errorText} accessibilityRole="alert">{sessionError}</Text>
              <SubmitButton title="TRY AGAIN" onPress={retrySession} />
            </>
          )}
        </View>
      </MainSafe>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!user} redirectTo="/dashboard">
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
        </Stack.Protected>
        <Stack.Protected guard={!!user} redirectTo="/auth/login">
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Screen name="auth/forgot-password" />
        <Stack.Screen name="auth/verify" />
      </Stack>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <MainSafe>
      <View style={styles.sessionStatus}>
        <Text accessibilityRole="alert" style={styles.errorText}>We could not open the app. Please try again.</Text>
        <SubmitButton title="TRY AGAIN" onPress={retry} />
      </View>
    </MainSafe>
  );
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const initialize = useCallback(async (database: SQLiteDatabase) => {
    await initializeDatabase(database);
    setInitializing(false);
  }, []);

  return (
    <>
      {initializing && (
        <MainSafe>
          <View style={styles.sessionStatus}>
            <ActivityIndicator color="#21484a" accessibilityLabel="Preparing your app" />
            <Text style={styles.statusText}>Preparing your app. This may take a moment.</Text>
          </View>
        </MainSafe>
      )}
      <SQLiteProvider databaseName="motor-rental.db" onInit={initialize}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SQLiteProvider>
    </>
  );
}

const styles = StyleSheet.create({
  statusText: { color: '#21484a', fontSize: 16, textAlign: 'center' },
  sessionStatus: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: '#991b1b', fontSize: 16, lineHeight: 24, textAlign: 'center' },
});

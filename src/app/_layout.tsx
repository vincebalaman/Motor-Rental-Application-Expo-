import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
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

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="motor-rental.db" onInit={initializeDatabase}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  sessionStatus: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: '#991b1b', fontSize: 16, lineHeight: 24, textAlign: 'center' },
});

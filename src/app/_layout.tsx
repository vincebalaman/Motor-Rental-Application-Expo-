import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function AppNavigator() {
  const colorScheme = useColorScheme();
  const { user, loading, sessionError, retrySession, logout } = useAuth();
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const returnToLogin = async () => {
    setLeaving(true); setLeaveError(null);
    try { await logout(); } catch { setLeaveError('We could not sign you out. Please try again.'); }
    finally { setLeaving(false); }
  };

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
              <SubmitButton title="RETURN TO LOGIN" onPress={returnToLogin} isSubmitting={leaving} />
              {leaveError && <Text style={styles.errorText} accessibilityRole="alert">{leaveError}</Text>}
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
        <Stack.Screen name="auth/reset-password" />
        <Stack.Screen name="auth/verify" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  sessionStatus: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  errorText: { color: '#991b1b', fontSize: 16, lineHeight: 24, textAlign: 'center' },
});

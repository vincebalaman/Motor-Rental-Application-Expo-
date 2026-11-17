import * as Linking from 'expo-linking';
import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import Input from '@/components/input';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { getRecoveryClient } from '@/lib/supabase';
import { createPasswordRecoveryService, recoveryErrorMessage } from '@/services/password-recovery';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const running = useRef(false);
  const redirectTo = process.env.EXPO_PUBLIC_RECOVERY_REDIRECT_URL?.trim() || Linking.createURL('auth/reset-password');
  const send = async () => {
    if (running.current || cooldown) return;
    running.current = true; setBusy(true); setError(null);
    try {
      await createPasswordRecoveryService(getRecoveryClient()).request(email, redirectTo);
      setSent(true); setCooldown(60);
    } catch (cause) { setError(recoveryErrorMessage(cause)); }
    finally { running.current = false; setBusy(false); }
  };
  return (
    <MainSafe>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.copy}>Enter your account email. Open the reset link on this device to choose a new password.</Text>
          <Input placeholder="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" returnKeyType="send" onSubmitEditing={send} editable={!busy && !sent} />
          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {sent ? (
            <View style={styles.panel}>
              <Text accessibilityRole="alert" style={styles.copy}>If an account exists for that email, a reset link will be sent. Check your inbox and spam folder, then open the newest link on this device.</Text>
              <Text style={styles.copy}>{cooldown ? `You can request another link in ${cooldown} seconds.` : 'You can request another link now.'}</Text>
              <SubmitButton title="REQUEST ANOTHER LINK" onPress={() => { if (!cooldown) setSent(false); }} />
            </View>
          ) : <SubmitButton title="SEND RESET LINK" onPress={send} isSubmitting={busy} />}
          <Link href="/auth/login" replace style={styles.link}>Return to login</Link>
          {__DEV__ && <View style={styles.panel}>
            <Text style={styles.copy}>Development setup: add this return URL to Supabase → Authentication → URL Configuration → Redirect URLs.</Text>
            <Text selectable style={styles.copy}>{redirectTo}</Text>
          </View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flexGrow: 1, padding: 24, paddingTop: 48, gap: 20 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  copy: { color: '#64748b', fontSize: 15, lineHeight: 23 },
  error: { color: '#991b1b', fontSize: 14, lineHeight: 22 },
  panel: { backgroundColor: '#faf8f2', padding: 18, borderRadius: 12, gap: 12 },
  link: { color: '#21484a', fontSize: 16, fontWeight: '700', paddingVertical: 12 },
});

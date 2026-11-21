import { useLinkingURL } from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';

import Input from '@/components/input';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { getRecoveryClient } from '@/lib/supabase';
import { createPasswordRecoveryService, parseRecoveryCallback, recoveryCallbackParams, recoveryCallbackDiagnostic, recoveryErrorMessage } from '@/services/password-recovery';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ code?: string; sb_flow_id?: string; error?: string; error_code?: string; access_token?: string; refresh_token?: string }>();
  const link = useLinkingURL();
  const callbackKey = JSON.stringify(recoveryCallbackParams(params, link));
  const service = useMemo(() => createPasswordRecoveryService(getRecoveryClient()), []);
  const { logout } = useAuth();
  const [status, setStatus] = useState<'checking' | 'ready' | 'invalid' | 'saved'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [hidden, setHidden] = useState(true);
  const [confirmationHidden, setConfirmationHidden] = useState(true);
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!active) return;
      setStatus('checking'); setError(null); setPassword(''); setConfirmation('');
      await service.exchange(parseRecoveryCallback(JSON.parse(callbackKey)));
      if (!active) return;
      setStatus('ready');
      if (Platform.OS === 'web') window.history.replaceState(window.history.state, '', window.location.pathname);
    }).catch(cause => {
      if (active) { setStatus('invalid'); setError(recoveryErrorMessage(cause)); }
    });
    return () => { active = false; };
  }, [callbackKey, service]);

  const finish = async () => {
    await service.finish();
    await logout();
    router.replace({ pathname: '/auth/login', params: { passwordReset: '1' } });
  };
  const save = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try {
      if (status !== 'saved') {
        await service.updatePassword(password, confirmation);
        setPassword(''); setConfirmation(''); setStatus('saved');
      }
      await finish();
    } catch (cause) { setError(recoveryErrorMessage(cause)); }
    finally { running.current = false; setBusy(false); }
  };
  const requestAgain = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    try { await service.cancel(); router.replace('/auth/forgot-password'); }
    catch (cause) { setError(recoveryErrorMessage(cause)); }
    finally { running.current = false; setBusy(false); }
  };
  return <MainSafe>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{status === 'saved' ? 'Password updated' : 'Choose a new password'}</Text>
        {status === 'checking' && <><ActivityIndicator /><Text style={styles.copy}>Checking your reset link…</Text></>}
        {status === 'ready' && <>
          <Text style={styles.copy}>Use at least 8 characters, including one letter and one number.</Text>
          <Input placeholder="New password" type="password" value={password} onChangeText={setPassword} isHidden={hidden} togglePasswordVisibility={() => setHidden(value => !value)} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} />
          <Input placeholder="Confirm new password" type="password" value={confirmation} onChangeText={setConfirmation} isHidden={confirmationHidden} togglePasswordVisibility={() => setConfirmationHidden(value => !value)} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} onSubmitEditing={save} returnKeyType="done" />
          <SubmitButton title="SAVE NEW PASSWORD" onPress={save} isSubmitting={busy} />
        </>}
        {status === 'saved' && <><Text style={styles.copy}>Your password was saved. Finish signing out before logging in with your new password.</Text><SubmitButton title="RETURN TO LOGIN" onPress={save} isSubmitting={busy} /></>}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {__DEV__ && status === 'invalid' && <Text selectable style={styles.copy}>{recoveryCallbackDiagnostic(JSON.parse(callbackKey))}</Text>}
        {status !== 'checking' && status !== 'saved' && <SubmitButton title="REQUEST A NEW LINK" onPress={requestAgain} isSubmitting={busy} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </MainSafe>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, container: { flexGrow: 1, padding: 24, paddingTop: 48, gap: 20 },
  title: { color: '#0f172a', fontSize: 28, fontWeight: '800' },
  copy: { color: '#64748b', fontSize: 15, lineHeight: 23 },
  error: { color: '#991b1b', fontSize: 14, lineHeight: 22 },
});

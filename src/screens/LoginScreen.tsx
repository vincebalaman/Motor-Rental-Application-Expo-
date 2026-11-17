import { Link, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import Input from '@/components/input';
import MainSafe from '@/components/mainsafe';
import SubmitButton from '@/components/submitbtn';
import { useAuth } from '@/context/AuthContext';
import { authErrorMessage } from '@/services/auth';

export default function LoginScreen() {
  const { registered, passwordReset } = useLocalSearchParams<{ registered?: string; passwordReset?: string }>();
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const submitting = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);

  const togglePasswordVisibility = () => {
    setIsPasswordHidden(!isPasswordHidden);
  };

  const handleLogin = async () => {
    if (submitting.current) return;
    setFormError(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setFormError('Please enter your email and password.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    submitting.current = true;
    setIsSubmitting(true);
    try {
      await signIn(normalizedEmail, password);
      // The root route guard navigates once the shared profile and role are loaded.
    } catch (error) {
      setFormError(authErrorMessage(error));
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <MainSafe>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Log in to your account to continue</Text>

          {passwordReset && <Text style={styles.success} accessibilityRole="alert">Password updated. Log in with your new password.</Text>}
          {registered && <Text style={styles.success} accessibilityRole="alert">{registered === 'confirm' ? 'Check your email to confirm your account, then return here to log in.' : 'Your account is ready. Log in to continue.'}</Text>}
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <Input
                placeholder="Enter your email address"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordInput.current?.focus()}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <Input
                ref={passwordInput}
                placeholder="Enter your password"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                editable={!isSubmitting}
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                type="password"
                isHidden={isPasswordHidden}
                togglePasswordVisibility={togglePasswordVisibility}
              />
            </View>

            <View style={styles.forgotPassword}>
              <Link href="/auth/forgot-password">
                <Text style={styles.footerLink}>Forgot Password?</Text>
              </Link>
            </View>

            {formError && <Text style={styles.error} accessibilityRole="alert">{formError}</Text>}
            <SubmitButton title="LOG IN" isSubmitting={isSubmitting} onPress={handleLogin} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Do not have an account? </Text>
              <Link href="/auth/register">
                <Text style={styles.footerLink}>Sign Up</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  keyboardView: { flex: 1 },
  error: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
  success: { color: '#21484a', fontSize: 14, lineHeight: 21, marginBottom: 16 },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 28,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 2,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerLink: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },

  forgotPassword: {
  alignItems: 'flex-end',
  marginTop: -8,
  },
});

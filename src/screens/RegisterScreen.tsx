import { Link, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { type ComponentRef, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Input from "@/components/input";
import MainSafe from "@/components/mainsafe";
import SubmitButton from "@/components/submitbtn";
import { createUser } from "@/database/auth";

export default function RegisterScreen() {
  const database = useSQLiteContext();
  const emailInput = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const confirmInput = useRef<ComponentRef<typeof TextInput>>(null);
  const submitting = useRef(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmPasswordHidden, setIsConfirmPasswordHidden] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isPasswordHidden, setIsPasswordHidden] = useState(true);

  const togglePasswordVisibility = () => {
    setIsPasswordHidden(!isPasswordHidden);
  };

  const handleCreateAccount = async () => {
    if (submitting.current) return;
    setFormError(null);
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      setFormError("Please complete every field to continue.");
      return;
    }

    if (normalizedName.length < 2) {
      setFormError("Please enter your full name.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      setFormError("Use at least 8 characters, including one letter and one number.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Re-enter the same password in both fields.");
      return;
    }

    if (!acceptedTerms) {
      setFormError("Please agree to the rental terms before creating your account.");
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    try {
      await createUser(database, normalizedName, normalizedEmail, password);
      router.replace({ pathname: '/auth/login', params: { registered: '1' } });
    } catch (error) {
      const duplicateEmail = error instanceof Error && /UNIQUE constraint failed: users.email/i.test(error.message);
      setFormError(duplicateEmail
        ? 'An account with this email already exists. Please log in.'
        : 'We could not create your account. Please try again.');
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <MainSafe>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace("/auth/login")}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backIcon}>‹</Text>
            <Text style={styles.backText}>BACK</Text>
          </Pressable>

          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoMark}>MR</Text>
            </View>
            <View>
              <Text style={styles.brandName}>MOTOR RENTAL</Text>
              <Text style={styles.brandTagline}>YOUR NEXT RIDE STARTS HERE</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>JOIN THE JOURNEY</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Book a ride, take the long way home.</Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "name" && styles.inputFocused,
                ]}
                placeholder="e.g. Alex Morgan"
                placeholderTextColor="#9a9b91"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailInput.current?.focus()}
                editable={!isSubmitting}
                accessibilityLabel="Full name"
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === "email" && styles.inputFocused,
                ]}
                ref={emailInput}
                placeholder="you@example.com"
                placeholderTextColor="#9a9b91"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordInput.current?.focus()}
                editable={!isSubmitting}
                accessibilityLabel="Email address"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <Input
                ref={passwordInput}
                value={password}
                containerStyle={[styles.passwordInput, focusedField === 'password' && styles.inputFocused]}
                autoComplete="new-password"
                autoCapitalize="none"
                editable={!isSubmitting}
                placeholder="Create a password"
                type="password"
                onChangeText={setPassword}
                isHidden={isPasswordHidden}
                togglePasswordVisibility={togglePasswordVisibility}
                autoCorrect={false}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => confirmInput.current?.focus()}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <Input
                ref={confirmInput}
                placeholder="Re-enter your password"
                containerStyle={[styles.passwordInput, focusedField === 'confirmPassword' && styles.inputFocused]}
                autoComplete="new-password"
                autoCapitalize="none"
                editable={!isSubmitting}
                value={confirmPassword}
                type="password"
                onChangeText={setConfirmPassword}
                isHidden={isConfirmPasswordHidden}
                togglePasswordVisibility={() => setIsConfirmPasswordHidden((hidden) => !hidden)}
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCreateAccount}
                onFocus={() => setFocusedField("confirmPassword")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((accepted) => !accepted)}
              disabled={isSubmitting}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              >
                {acceptedTerms ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the rental terms and privacy policy.
              </Text>
            </Pressable>

            {formError && <Text style={styles.error} accessibilityRole="alert">{formError}</Text>}
            <SubmitButton
              title="CREATE ACCOUNT →"
              onPress={handleCreateAccount}
              isSubmitting={isSubmitting}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Link href="/auth/login" style={styles.footerLink}>
                {" "}
                Log in
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  error: { color: '#991b1b', fontSize: 14, lineHeight: 21 },
  passwordInput: { borderColor: '#d9d2c4', borderRadius: 4, paddingHorizontal: 15 },
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe6",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 34,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 12,
    marginBottom: 18,
  },
  backIcon: {
    color: "#21484a",
    fontSize: 30,
    lineHeight: 23,
    marginRight: 5,
  },
  backText: {
    color: "#21484a",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 42,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#21484a",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#c39b63",
    marginRight: 12,
  },
  logoMark: {
    color: "#f7f2e8",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  brandName: {
    color: "#21484a",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },
  brandTagline: {
    color: "#8d806c",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.3,
    marginTop: 3,
  },
  eyebrow: {
    color: "#c0783e",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 9,
  },
  title: {
    fontSize: 34,
    lineHeight: 39,
    fontWeight: "900",
    color: "#203334",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "#756f63",
    marginTop: 8,
    marginBottom: 29,
  },
  form: {
    gap: 17,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#405052",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#faf8f2",
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#203334",
    borderWidth: 1,
    borderColor: "#d9d2c4",
  },
  inputFocused: {
    borderColor: "#c0783e",
    shadowColor: "#c0783e",
    shadowOpacity: 0.12,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#b9ad99",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#21484a",
    borderColor: "#21484a",
  },
  checkmark: {
    color: "#f7f2e8",
    fontSize: 14,
    fontWeight: "900",
  },
  termsText: {
    flex: 1,
    color: "#756f63",
    fontSize: 12,
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 3,
  },
  footerText: {
    color: "#756f63",
    fontSize: 13,
  },
  footerLink: {
    color: "#c0783e",
    fontWeight: "800",
    fontSize: 13,
  },
});
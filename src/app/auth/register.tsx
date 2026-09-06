import { Link, router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { createUser } from "@/database/auth";

export default function RegisterScreen() {
  const database = useSQLiteContext();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleCreateAccount = async () => {
    const normalizedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!normalizedName || !normalizedEmail || !password || !confirmPassword) {
      Alert.alert(
        "Missing details",
        "Please complete every field to continue.",
      );
      return;
    }

    if (normalizedName.length < 2) {
      Alert.alert("Check your name", "Please enter your full name.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      Alert.alert("Check your email", "Please enter a valid email address.");
      return;
    }

    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      Alert.alert(
        "Create a stronger password",
        "Use at least 8 characters, including one letter and one number.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Re-enter the same password in both fields.",
      );
      return;
    }

    if (!acceptedTerms) {
      Alert.alert(
        "Almost there",
        "Please agree to the rental terms before creating your account.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser(database, normalizedName, normalizedEmail, password);
      Alert.alert(
        "You are ready to ride",
        "Your account has been created successfully.",
        [{ text: "Continue", onPress: () => router.replace("/auth/login") }],
      );
    } catch {
      Alert.alert(
        "Registration failed",
        "An account with this email already exists.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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
            onPress={() => router.back()}
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
              <Text style={styles.brandTagline}>
                YOUR NEXT RIDE STARTS HERE
              </Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>JOIN THE JOURNEY</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Book a ride, take the long way home.
          </Text>

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
                placeholder="you@example.com"
                placeholderTextColor="#9a9b91"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "password" && styles.inputFocused,
                ]}
              >
                <TextInput
                  style={styles.inputWithAction}
                  placeholder="8+ characters, one number"
                  placeholderTextColor="#9a9b91"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  returnKeyType="next"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  style={styles.visibilityButton}
                  onPress={() => setShowPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  <Text style={styles.visibilityText}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm password</Text>
              <View
                style={[
                  styles.inputShell,
                  focusedField === "confirmPassword" && styles.inputFocused,
                ]}
              >
                <TextInput
                  style={styles.inputWithAction}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9a9b91"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateAccount}
                  onFocus={() => setFocusedField("confirmPassword")}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  style={styles.visibilityButton}
                  onPress={() => setShowConfirmPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? "Hide confirmed password"
                      : "Show confirmed password"
                  }
                >
                  <Text style={styles.visibilityText}>
                    {showConfirmPassword ? "HIDE" : "SHOW"}
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((accepted) => !accepted)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTerms }}
            >
              <View
                style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked,
                ]}
              >
                {acceptedTerms ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.termsText}>
                I agree to the rental terms and privacy policy.
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              accessibilityRole="button"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#f7f2e8" />
              ) : (
                <Text style={styles.buttonText}>CREATE ACCOUNT →</Text>
              )}
            </Pressable>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  inputShell: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf8f2",
    borderRadius: 4,
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
  inputWithAction: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 15,
    fontSize: 15,
    color: "#203334",
  },
  visibilityButton: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  visibilityText: {
    color: "#c0783e",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
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
  button: {
    backgroundColor: "#21484a",
    minHeight: 54,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#f7f2e8",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.4,
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

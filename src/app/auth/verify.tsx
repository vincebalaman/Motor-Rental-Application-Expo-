import { Link } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function VerifyScreen() {
  const [code, setCode] = useState('');

  const handleVerify = () => {
    if (!code) {
      Alert.alert('Missing Code', 'Please enter the verification code.');
      return;
    }

    if (code.length !== 6) {
      Alert.alert(
        'Invalid Code',
        'Please enter the 6-digit verification code.'
      );
      return;
    }

    Alert.alert(
      'Verification Successful',
      'Your email has been verified successfully.'
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verification</Text>

      <Text style={styles.subtitle}>
        Enter the 6-digit verification code sent to your email address.
      </Text>

      <View style={styles.form}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Verification Code</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            placeholderTextColor="#94a3b8"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleVerify}
        >
          <Text style={styles.buttonText}>Verify Code</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive the code? </Text>

          <Link href="/auth/forgot-password">
            <Text style={styles.footerLink}>Send Again</Text>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
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
    lineHeight: 20,
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

  input: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    textAlign: 'center',
    letterSpacing: 4,
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
});


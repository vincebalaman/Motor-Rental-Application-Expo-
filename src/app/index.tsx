import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MainSafe from '@/components/mainsafe';

export default function LandingScreen() {
  const handleGetStarted = () => {
    router.navigate('/auth/login');
  };

  return (
    <MainSafe>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logo}>🏍️</Text>

          <Text style={styles.title}>MotorRent</Text>

          <Text style={styles.subtitle}>
            Rent your ride. Explore the road.
          </Text>

          <Text style={styles.description}>
            Find the perfect motor for your next adventure.
            Simple, convenient, and ready when you are.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGetStarted}
          >
            <Text style={styles.buttonText}>GET STARTED</Text>
          </TouchableOpacity>
        </View>
      </View>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },

  content: {
    alignItems: 'center',
  },

  logo: {
    fontSize: 64,
    marginBottom: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 16,
  },

  description: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },

  button: {
    backgroundColor: "#21484a",
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
  },

  buttonText: {
    color: "#f7f2e8",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1.4,
  },
});

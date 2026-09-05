import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LandingScreen() {
  const handleGetStarted = () => {
    router.navigate('/auth/login');
  };

  return (
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
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 10,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

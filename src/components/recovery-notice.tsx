import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import MainSafe from '@/components/mainsafe';

export default function RecoveryNotice({ title }: { title: string }) {
  return (
    <MainSafe>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>
          Password recovery and email verification are coming in a future update.
          For now, sign in using your existing email address and password.
        </Text>
        <View style={styles.actions}>
          <Link href="/auth/login" replace style={styles.link}>Return to login</Link>
        </View>
      </ScrollView>
    </MainSafe>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  title: { color: '#0f172a', fontSize: 26, fontWeight: '700', marginBottom: 16 },
  description: { color: '#64748b', fontSize: 16, lineHeight: 25 },
  actions: { marginTop: 24 },
  link: { color: '#21484a', fontSize: 16, fontWeight: '700', paddingVertical: 12 },
});

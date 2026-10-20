import { Pressable, StyleSheet, Text, View } from 'react-native';
import { postMotor, putMotor, patchMotor, deleteMotor } from '../../services/motorApi';

export default function ApiTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>API Test</Text>
      <Text style={styles.subtitle}>Results appear in terminal</Text>

      <Pressable style={[styles.button, styles.post]} onPress={postMotor}>
        <Text style={styles.buttonText}>POST</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.put]} onPress={putMotor}>
        <Text style={styles.buttonText}>PUT</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.patch]} onPress={patchMotor}>
        <Text style={styles.buttonText}>PATCH</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.delete]} onPress={deleteMotor}>
        <Text style={styles.buttonText}>DELETE</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#888', marginBottom: 16 },
  button: { padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  post: { backgroundColor: '#16a34a' },
  put: { backgroundColor: '#2563eb' },
  patch: { backgroundColor: '#f59e0b' },
  delete: { backgroundColor: '#dc2626' },
});
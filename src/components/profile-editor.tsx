import { type ComponentRef, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Input from '@/components/input';
import { useAuth } from '@/context/AuthContext';
import { profileErrorMessage } from '@/services/profile';

export default function ProfileEditor({ fullName, phone, onCancel, onSaved, onBusy }: {
  fullName: string; phone: string | null; onCancel: () => void; onSaved: () => void; onBusy: (busy: boolean) => void;
}) {
  const { updateProfile } = useAuth();
  const [name, setName] = useState(fullName);
  const [number, setNumber] = useState(phone ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const phoneRef = useRef<ComponentRef<typeof TextInput>>(null);
  const save = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); onBusy(true); setError(null);
    try { await updateProfile(name, number); onSaved(); }
    catch (cause) { setError(profileErrorMessage(cause)); }
    finally { running.current = false; setBusy(false); onBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>Edit profile</Text>
    <Text style={styles.copy}>Update the details used for your bookings.</Text>
    <Text style={styles.label}>Full name</Text>
    <Input placeholder="Your full name" value={name} onChangeText={setName} editable={!busy} autoCapitalize="words" autoComplete="name" containerStyle={styles.input} maxLength={120} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()} />
    <Text style={styles.label}>Phone number · Optional</Text>
    <Input ref={phoneRef} placeholder="0917 123 4567 or +63 917 123 4567" value={number} onChangeText={setNumber} editable={!busy} autoComplete="tel" keyboardType="phone-pad" autoCorrect={false} autoCapitalize="none" containerStyle={styles.input} maxLength={30} onSubmitEditing={() => { void save(); }} />
    <Text style={styles.copy}>The rental shop can use this number to contact you about bookings. Leave it blank to remove your saved number. </Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => { void save(); }} style={[styles.saveButton, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save changes</Text>}</Pressable>
    <Pressable accessibilityRole="button" disabled={busy} style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancel editing</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ panel: { padding: 20, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e5de', gap: 14 }, input: { borderRadius: 12, borderColor: '#dce4dd', minHeight: 54, backgroundColor: '#fff' }, saveButton: { minHeight: 52, backgroundColor: '#21484a', borderRadius: 13, padding: 16, justifyContent: 'center', alignItems: 'center' }, saveText: { color: '#fff', fontSize: 15, fontWeight: '600' }, disabled: { opacity: 0.4 }, title: { color: '#1d2928', fontSize: 20, fontWeight: '600', letterSpacing: -0.4 }, label: { color: '#65736e', fontSize: 12 }, copy: { color: '#5c6b67', fontSize: 13, lineHeight: 21 }, error: { color: '#9b3d29', lineHeight: 22 }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#21484a', fontWeight: '600', fontSize: 13 } });

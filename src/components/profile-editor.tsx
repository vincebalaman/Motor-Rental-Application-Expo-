import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Input from '@/components/input';
import SubmitButton from '@/components/submitbtn';
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
    <Text style={styles.title}>Make it yours</Text>
    <Text style={styles.copy}>Keep your name and booking contact details up to date.</Text>
    <Text style={styles.label}>FULL NAME</Text>
    <Input placeholder="Your full name" value={name} onChangeText={setName} editable={!busy} autoCapitalize="words" autoComplete="name" containerStyle={styles.input} maxLength={120} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => phoneRef.current?.focus()} />
    <Text style={styles.label}>PHONE NUMBER · OPTIONAL</Text>
    <Input ref={phoneRef} placeholder="0917 123 4567 or +63 917 123 4567" value={number} onChangeText={setNumber} editable={!busy} autoComplete="tel" keyboardType="phone-pad" autoCorrect={false} autoCapitalize="none" containerStyle={styles.input} maxLength={30} onSubmitEditing={() => { void save(); }} />
    <Text style={styles.copy}>The rental shop can use this number to contact you about bookings. Leave it blank to remove your saved number. </Text>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <SubmitButton style={styles.saveButton} title="SAVE CHANGES" onPress={() => { void save(); }} isSubmitting={busy} />
    <Pressable accessibilityRole="button" disabled={busy} style={styles.cancel} onPress={onCancel}><Text style={styles.cancelText}>Cancel editing</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ panel: { padding: 22, backgroundColor: '#faf8f2', borderRadius: 22, borderWidth: 1, borderColor: '#e1e2d7', gap: 16 }, input: { borderRadius: 12, borderColor: '#dce1d3', minHeight: 54 }, saveButton: { borderRadius: 12 }, title: { color: '#21484a', fontSize: 21, fontWeight: '800' }, label: { color: '#526e65', fontSize: 10, fontWeight: '800', letterSpacing: 1 }, copy: { color: '#687a75', fontSize: 13, lineHeight: 21 }, error: { color: '#991b1b', lineHeight: 22 }, cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: '#21484a', fontWeight: '700' } });

import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

/** Uses regular React Native controls, so Expo Go needs no additional native module. */
export default function BookingTimePicker({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (time: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);
  const show = () => {
    const h = value ? Number(value.slice(0, 2)) : 9;
    setHour(h % 12 || 12); setMinute(value ? Number(value.slice(3)) : 0); setPm(h >= 12); setOpen(true);
  };
  const choice = (label: string, selected: boolean, onPress: () => void) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={[styles.text, selected && styles.white]}>{label}</Text></Pressable>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose pickup time, Philippine time" disabled={disabled} onPress={show} style={styles.trigger}><Text style={styles.text}>{value ? `${Number(value.slice(0, 2)) % 12 || 12}:${value.slice(3)} ${Number(value.slice(0, 2)) >= 12 ? 'PM' : 'AM'}` : 'Choose pickup time'} ▾</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.sheet} accessibilityViewIsModal>
        <Text accessibilityRole="header" style={styles.title}>Pickup time</Text><Text style={styles.hint}>Philippine time · Choose hour and minute</Text>
        <Text accessibilityLiveRegion="polite" style={styles.preview}>{hour}:{String(minute).padStart(2, '0')} {pm ? 'PM' : 'AM'}</Text>
        <View style={styles.columns}>
          <View style={styles.column}><Text style={styles.hint}>HOUR</Text><ScrollView style={styles.wheel} contentContainerStyle={styles.options}>{Array.from({ length: 12 }, (_, i) => choice(String(i + 1), hour === i + 1, () => setHour(i + 1)))}</ScrollView></View>
          <View style={styles.column}><Text style={styles.hint}>MINUTE</Text><ScrollView style={styles.wheel} contentContainerStyle={styles.options}>{Array.from({ length: 60 }, (_, i) => choice(String(i).padStart(2, '0'), minute === i, () => setMinute(i)))}</ScrollView></View>
          <View style={styles.column}><Text style={styles.hint}>PERIOD</Text>{choice('AM', !pm, () => setPm(false))}{choice('PM', pm, () => setPm(true))}</View>
        </View>
        <Pressable accessibilityRole="button" onPress={() => { onChange(`${String(hour % 12 + (pm ? 12 : 0)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`); setOpen(false); }} style={[styles.choice, styles.selected]}><Text style={[styles.text, styles.white]}>USE THIS TIME</Text></Pressable>
        <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.choice}><Text style={styles.text}>Cancel</Text></Pressable>
      </View></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ trigger: { minHeight: 54, padding: 16, backgroundColor: '#e6ecdf', borderRadius: 14, justifyContent: 'center' }, text: { color: '#21484a', fontSize: 16, fontWeight: '700', textAlign: 'center' }, overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 600, alignSelf: 'center', backgroundColor: '#faf8f2', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 24, paddingBottom: 36, gap: 12 }, title: { fontSize: 24, fontWeight: '800', color: '#183334' }, hint: { fontSize: 12, color: '#526e65', textAlign: 'center' }, preview: { fontSize: 30, fontWeight: '800', color: '#21484a', textAlign: 'center' }, columns: { flexDirection: 'row', gap: 12 }, column: { flex: 1, gap: 8 }, wheel: { height: 210 }, options: { gap: 6 }, choice: { minHeight: 46, borderRadius: 12, padding: 12, justifyContent: 'center', backgroundColor: '#e6ecdf' }, selected: { backgroundColor: '#21484a' }, white: { color: '#fff' } });

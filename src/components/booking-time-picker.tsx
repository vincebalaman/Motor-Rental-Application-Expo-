import { type ComponentRef, useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Uses regular React Native controls, so Expo Go needs no additional native module. */
export default function BookingTimePicker({ value, disabled, onChange }: { value: string; disabled?: boolean; onChange: (time: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(false);
  const hoursRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const minutesRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const rowStride = useRef({ hour: 52, minute: 52 });
  const initialPosition = useRef({ hour: 9, minute: 0 });
  const insets = useSafeAreaInsets();
  const show = () => {
    Keyboard.dismiss();
    const h = value ? Number(value.slice(0, 2)) : 9;
    const m = value ? Number(value.slice(3)) : 0;
    initialPosition.current = { hour: h % 12 || 12, minute: m };
    setHour(h % 12 || 12); setMinute(m); setPm(h >= 12); setOpen(true);
  };
  const choice = (label: string, selected: boolean, onPress: () => void, accessibleLabel = label) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={accessibleLabel} accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={[styles.text, selected && styles.white]}>{label}</Text></Pressable>;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `Change pickup time, ${Number(value.slice(0, 2)) % 12 || 12}:${value.slice(3)} ${Number(value.slice(0, 2)) >= 12 ? 'PM' : 'AM'}, Philippine time` : 'Choose pickup time, Philippine time'} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={show} style={[styles.trigger, disabled && styles.disabled]}><Text style={styles.triggerText}>{value ? `${Number(value.slice(0, 2)) % 12 || 12}:${value.slice(3)} ${Number(value.slice(0, 2)) >= 12 ? 'PM' : 'AM'}` : 'Choose time'}</Text><Text accessible={false} style={styles.triggerText}>▾</Text></Pressable>
    <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
        <View accessible={false} style={styles.handle} />
        <View style={styles.sheetHeader}><Text accessibilityRole="header" style={styles.title}>Pickup time</Text><Text style={styles.hint}>Philippine time</Text></View>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
          <Text accessibilityLiveRegion="polite" style={styles.preview}>{hour}:{String(minute).padStart(2, '0')} {pm ? 'PM' : 'AM'}</Text>
          <View style={styles.period}>{choice('AM', !pm, () => setPm(false))}{choice('PM', pm, () => setPm(true))}</View>
          <View style={styles.quickTimes}>{[9, 12, 15, 18].map(h => <Pressable key={h} accessibilityRole="button" accessibilityLabel={`Set ${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`} onPress={() => { setHour(h % 12 || 12); setMinute(0); setPm(h >= 12); hoursRef.current?.scrollTo({ y: Math.max(0, (h % 12 || 12) - 2) * rowStride.current.hour, animated: true }); minutesRef.current?.scrollTo({ y: 0, animated: true }); }} style={styles.quickTime}><Text style={styles.quickText}>{h % 12 || 12} {h >= 12 ? 'PM' : 'AM'}</Text></Pressable>)}</View>
          <View style={styles.columns}>
            <View style={styles.column}><Text style={styles.hint}>Hour</Text><ScrollView ref={hoursRef} style={styles.wheel} contentContainerStyle={styles.options} nestedScrollEnabled onContentSizeChange={(_, height) => { rowStride.current.hour = (height - 4) / 12; hoursRef.current?.scrollTo({ y: Math.max(0, initialPosition.current.hour - 2) * rowStride.current.hour, animated: false }); }}>{Array.from({ length: 12 }, (_, i) => choice(String(i + 1).padStart(2, '0'), hour === i + 1, () => setHour(i + 1), `Hour ${i + 1}`))}</ScrollView></View>
            <View style={styles.column}><Text style={styles.hint}>Minute</Text><ScrollView ref={minutesRef} style={styles.wheel} contentContainerStyle={styles.options} nestedScrollEnabled onContentSizeChange={(_, height) => { rowStride.current.minute = (height - 4) / 60; minutesRef.current?.scrollTo({ y: Math.max(0, initialPosition.current.minute - 1) * rowStride.current.minute, animated: false }); }}>{Array.from({ length: 60 }, (_, i) => choice(String(i).padStart(2, '0'), minute === i, () => setMinute(i), `Minute ${String(i).padStart(2, '0')}`))}</ScrollView></View>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => { onChange(`${String(hour % 12 + (pm ? 12 : 0)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`); setOpen(false); }} style={styles.confirm}><Text style={[styles.text, styles.white]}>Use this time</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.cancel}><Text style={styles.text}>Cancel</Text></Pressable>
        </View>
      </View></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 10, backgroundColor: '#f2f5ef', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, triggerText: { color: '#21484a', fontSize: 14, fontWeight: '500', flexShrink: 1 }, text: { color: '#21484a', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: '#14252366', justifyContent: 'flex-end' }, sheet: { width: '100%', maxWidth: 600, maxHeight: '92%', alignSelf: 'center', backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 10 }, handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#dce4dd', alignSelf: 'center', marginBottom: 18 }, sheetHeader: { paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }, title: { fontSize: 21, fontWeight: '600', color: '#1d2928', letterSpacing: -0.4 }, hint: { fontSize: 12, color: '#65736e', lineHeight: 19 },
  body: { flexGrow: 0, flexShrink: 1 }, bodyContent: { paddingHorizontal: 24, gap: 14, paddingBottom: 16 }, preview: { fontSize: 36, fontWeight: '600', color: '#1d2928', textAlign: 'center', letterSpacing: -1, paddingVertical: 4 }, period: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#f2f5ef', padding: 4, borderRadius: 12, gap: 4 }, quickTimes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }, quickTime: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#e2e5de', borderRadius: 10 }, quickText: { color: '#526663', fontSize: 12, fontWeight: '500' }, columns: { flexDirection: 'row', gap: 16 }, column: { flex: 1, gap: 8 }, wheel: { height: 192, borderWidth: 1, borderColor: '#e2e5de', borderRadius: 12 }, options: { padding: 4, gap: 4 }, choice: { minHeight: 48, borderRadius: 9, padding: 12, justifyContent: 'center', minWidth: 76 }, selected: { backgroundColor: '#21484a' }, white: { color: '#fff' }, footer: { paddingHorizontal: 24, paddingTop: 14, gap: 4, borderTopWidth: 1, borderColor: '#edf0e9' }, confirm: { minHeight: 52, borderRadius: 13, padding: 16, backgroundColor: '#21484a', justifyContent: 'center' }, cancel: { minHeight: 44, padding: 12, justifyContent: 'center' }, disabled: { opacity: 0.4 },
});

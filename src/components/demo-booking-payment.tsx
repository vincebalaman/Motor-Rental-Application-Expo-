import { dailyPrice } from '@/components/catalog-card';
import MainSafe from '@/components/mainsafe';
import { MotorFormButton, motorFormStyles } from '@/components/motor-form';
import { useBookingClock } from '@/hooks/use-booking-clock';
import type { Booking } from '@/services/bookings';
import { createDemoPaymentService, demoCanPay, type DemoMethod, type DemoOutcome, type DemoReceipt } from '@/services/demo-payments';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useMemo, useRef, useState } from 'react';
import { AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
const methods: { id: DemoMethod; title: string; description: string }[] = [
  { id: 'gcash', title: 'GCash', description: 'Pay with your GCash wallet' },
  { id: 'maya', title: 'Maya', description: 'Pay with your Maya wallet' },
  { id: 'card', title: 'Debit or credit card', description: 'Visa / Mastercard' },
];
function PaymentIcon({ method }: { method: DemoMethod }) {
  return <View accessible={false} style={[styles.paymentIcon, method === 'gcash' ? styles.gcashIcon : method === 'maya' ? styles.mayaIcon : styles.cardIcon]}>
    {method === 'card' ? <SymbolView name={{ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' }} size={25} tintColor="#21484a" /> : <Text style={method === 'gcash' ? styles.gcashMark : styles.mayaMark}>{method === 'gcash' ? 'G' : 'm'}</Text>}
  </View>;
}
export default function DemoBookingPayment({ booking, admin = false }: { booking: Booking; admin?: boolean }) {
  const clock = useBookingClock();
  const service = useMemo(() => createDemoPaymentService(AsyncStorage), []);
  const [receipt, setReceipt] = useState<DemoReceipt | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<DemoMethod>('gcash');
  const [busy, setBusy] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(false); const revision = useRef(0); const running = useRef(false);
  const load = useCallback(async () => {
    const version = ++revision.current;
    try {
      const result = await service.load(booking);
      if (active.current && version === revision.current) { setReceipt(result); setReady(true); setError(null); }
    } catch { if (active.current && version === revision.current) { setReady(false); setError('Could not load the demo result. Please try again.'); } }
  }, [booking, service]);
  const invalidate = useCallback(() => { revision.current++; }, []);
  useFocusEffect(useCallback(() => {
    active.current = true;
    const timer = setTimeout(() => { if (!running.current) setBusy(false); void load(); }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active' && !running.current) void load(); });
    return () => { active.current = false; invalidate(); clearTimeout(timer); listener.remove(); };
  }, [load, invalidate]));
  const run = async (outcome: DemoOutcome | 'reset') => {
    if (running.current || !ready) return;
    running.current = true; revision.current++; setBusy(true); setError(null);
    try {
      if (outcome === 'reset') { await service.reset(booking); if (active.current) setReceipt(null); }
      else { const row = await service.simulate(booking, method, outcome); if (active.current) setReceipt(row); }
      if (active.current) setOpen(false);
    } catch (cause) { if (active.current) setError(cause instanceof Error ? cause.message : 'Could not save the demo result.'); }
    finally { running.current = false; if (active.current) setBusy(false); }
  };
  const closed = ['cancelled', 'rejected', 'no_show'].includes(booking.status);
  const success = receipt?.outcome === 'success';
  const total = booking.status === 'completed' ? booking.final_total_centavos ?? booking.total_centavos : booking.total_centavos;
  return <View style={motorFormStyles.panel}>
    <Text style={motorFormStyles.sectionTitle}>Payment</Text>
    {!ready && !error && <Text style={styles.copy}>Loading payment details…</Text>}
    {ready && <>
      <Text style={styles.status}>{closed ? success ? 'Booking closed · practice payment recorded' : 'Booking closed' : booking.status === 'pending' ? 'Awaiting approval' : success ? 'Payment successful' : receipt?.outcome === 'failed' ? 'Payment declined' : receipt?.outcome === 'cancelled' ? 'Checkout cancelled' : 'Choose how to pay'}</Text>
      <View style={styles.row}><Text style={styles.copy}>Base rental</Text><Text style={styles.amount}>{dailyPrice(booking.total_centavos / 100)}</Text></View>
      {success && <>
        <View style={styles.row}><Text style={styles.copy}>Amount paid</Text><Text style={styles.amount}>{dailyPrice(receipt.amount / 100)}</Text></View>
        {!closed && <View style={styles.row}><Text style={styles.copy}>Remaining balance</Text><Text style={styles.amount}>{dailyPrice(Math.max(0, total - receipt.amount) / 100)}</Text></View>}
      </>}
      {receipt && <View style={styles.receipt}><Text style={styles.receiptTitle}>Checkout details · {methods.find(item => item.id === receipt.method)?.title}</Text><Text selectable style={styles.copy}>{receipt.reference}</Text><Text style={motorFormStyles.hint}>{new Date(receipt.recordedAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} PHT · {receipt.outcome === 'success' ? 'Successful' : receipt.outcome === 'failed' ? 'Declined' : 'Cancelled'}</Text></View>}
      {!admin && !success && demoCanPay(booking, clock) && <MotorFormButton title={receipt ? 'Try again' : 'Pay online'} busy={busy} onPress={() => { setError(null); setShowControls(false); setOpen(true); }} />}
      {booking.status === 'pending' && <Text style={styles.copy}>The admin must approve this booking before you can try checkout.</Text>}
      {!admin && !closed && !success && <Text style={motorFormStyles.hint}>Cash on pickup is also available. A declined or cancelled checkout does not cancel your booking.</Text>}
    </>}
    {error && <Text accessibilityRole="alert" style={motorFormStyles.saveError}>{error}</Text>}
    {!ready && <MotorFormButton title="Try again" tone="outline" busy={busy} onPress={() => void load()} />}
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!running.current) setOpen(false); }}>
      <MainSafe><ScrollView contentContainerStyle={styles.checkout}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close checkout" disabled={busy} onPress={() => { if (!running.current) setOpen(false); }} style={styles.backButton}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={18} tintColor="#21484a" /><Text style={styles.backText}>Back to booking</Text></Pressable>
        <Text accessibilityRole="header" style={styles.title}>Checkout</Text>
        <Text style={styles.copy}>Choose your preferred payment method.</Text>
        <View style={styles.orderSummary}>
          <Text style={styles.eyebrow}>RENTAL SUMMARY</Text>
          <Text style={styles.orderName}>{booking.motor_name}</Text>
          <View style={styles.row}><Text style={styles.copy}>Base rental</Text><Text style={styles.amount}>{dailyPrice(booking.total_centavos / 100)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.receiptTitle}>Total to pay</Text><Text style={styles.total}>{dailyPrice(booking.total_centavos / 100)}</Text></View>
        </View>
        <Text style={styles.sectionHeading}>Payment method</Text>
        <View style={styles.methodList}>
          {methods.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: method === item.id, disabled: busy }} disabled={busy} onPress={() => setMethod(item.id)} style={[styles.method, method === item.id && styles.selected]}>
            <PaymentIcon method={item.id} />
            <View style={styles.methodCopy}><Text style={styles.receiptTitle}>{item.title}</Text><Text style={motorFormStyles.hint}>{item.description}</Text></View>
            <SymbolView name={method === item.id ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' } : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }} size={23} tintColor={method === item.id ? '#21484a' : '#bdc8c2'} accessible={false} />
          </Pressable>)}
        </View>
        {error && <Text accessibilityRole="alert" style={motorFormStyles.saveError}>{error}</Text>}
        <View style={styles.payActions}>
          <MotorFormButton title={`Pay ${dailyPrice(booking.total_centavos / 100)}`} busy={busy} onPress={() => void run('success')} />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run('cancelled')} style={styles.cancelLink}><Text style={styles.backText}>Cancel checkout</Text></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showControls, disabled: busy }} disabled={busy} onPress={() => setShowControls(value => !value)} style={styles.controlsToggle}><Text style={motorFormStyles.hint}>Presentation controls {showControls ? '−' : '+'}</Text></Pressable>
        {showControls && <MotorFormButton title="Simulate a declined payment" tone="outline" busy={busy} onPress={() => void run('failed')} />}
      </ScrollView></MainSafe>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
 header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
 status: { color: '#21484a', fontSize: 17, fontWeight: '600' }, copy: { color: '#65736e', fontSize: 13, lineHeight: 21 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, amount: { color: '#21484a', fontSize: 15, fontWeight: '600' },
 receipt: { backgroundColor: '#f4f6f1', padding: 14, borderRadius: 12, gap: 7 }, receiptTitle: { color: '#273b37', fontSize: 14, fontWeight: '600' }, checkout: { padding: 24, gap: 18, maxWidth: 620, width: '100%', alignSelf: 'center', paddingBottom: 40 }, title: { color: '#1d2928', fontSize: 28, fontWeight: '700' }, total: { color: '#21484a', fontSize: 28, fontWeight: '700', letterSpacing: -0.7 }, method: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#dce4dd', backgroundColor: '#fff', padding: 16, borderRadius: 14, gap: 14, minHeight: 84 }, selected: { borderColor: '#21484a', backgroundColor: '#f0f5ef' },
 paymentIcon: { width: 48, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, gcashIcon: { backgroundColor: '#0066ed' }, mayaIcon: { backgroundColor: '#102b21' }, cardIcon: { backgroundColor: '#e7eeea' }, gcashMark: { color: '#fff', fontSize: 28, fontWeight: '800' }, mayaMark: { color: '#71ee5b', fontSize: 34, lineHeight: 38, fontWeight: '800' },
 methodCopy: { flex: 1, minWidth: 0, gap: 3 }, methodList: { gap: 10 }, sectionHeading: { color: '#273b37', fontSize: 16, fontWeight: '600', marginTop: 4 }, orderSummary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e5de', borderRadius: 18, padding: 20, gap: 15 }, eyebrow: { color: '#65736e', fontSize: 10, fontWeight: '600', letterSpacing: 1.5 }, orderName: { color: '#273b37', fontSize: 19, fontWeight: '600' }, totalRow: { borderTopWidth: 1, borderColor: '#edf0e9', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }, payActions: { gap: 12, marginTop: 8 }, practiceNote: { color: '#65736e', fontSize: 12, lineHeight: 19 }, backButton: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, alignSelf: 'flex-start' }, backText: { color: '#21484a', fontSize: 13, fontWeight: '600' }, cancelLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' }, controlsToggle: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});

import DemoBookingPayment from '@/components/demo-booking-payment';
import { useBookingClock } from '@/hooks/use-booking-clock';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Platform, Text, View } from 'react-native';
import { MotorFormButton, motorFormStyles as styles } from '@/components/motor-form';
import { dailyPrice } from '@/components/catalog-card';
import { getSupabaseClient } from '@/lib/supabase';
import { createPaymentService, paymentSummary, type Payment } from '@/services/payments';
import type { Booking } from '@/services/bookings';

export default function BookingPayment(props: { booking: Booking; admin?: boolean }) {
 // Educational mode never mounts the provider component or calls payment RPCs.
 return process.env.EXPO_PUBLIC_PAYMENT_MODE === 'provider' ? <ProviderBookingPayment {...props} /> : <DemoBookingPayment key={`${props.booking.client_id}:${props.booking.id}`} {...props} />;
}
function ProviderBookingPayment({booking,admin=false}:{booking:Booking;admin?:boolean}) {
 const clock=useBookingClock();
 const service=useMemo(()=>createPaymentService(getSupabaseClient()),[]);
 const [rows,setRows]=useState<Payment[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [confirmCash,setConfirmCash]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const generation=useRef(0);const focused=useRef(false);const running=useRef(false);
 const load=useCallback(async()=>{
  const version=++generation.current;
  try{const data=await service.list(booking.id);if(focused.current&&version===generation.current){setRows(data);setLoaded(true);setError(null);}}
  catch(cause){if(focused.current&&version===generation.current){setLoaded(false);setError(cause instanceof Error?cause.message:'Could not load payments.');}}
 },[booking.id,service]);
 useFocusEffect(useCallback(()=>{
  focused.current=true;const timer=setTimeout(()=>void load(),0);
  const listener=AppState.addEventListener('change',state=>{if(state==='active'&&!running.current)void load();});
  const poll=setInterval(()=>{if(AppState.currentState==='active'&&!running.current)void load();},30000);
  return()=>{focused.current=false;generation.current++;clearTimeout(timer);clearInterval(poll);listener.remove();};
 },[load]));
 const summary=paymentSummary(rows,booking.total_centavos,booking.status==='completed'?booking.final_total_centavos??booking.total_centavos:booking.total_centavos,booking.status);
 const payable=booking.status==='approved'&&Date.parse(booking.scheduled_pickup_at||`${booking.pickup_date}T00:00:00+08:00`)>clock;
 const closed=['cancelled','rejected','no_show'].includes(booking.status);
 const run=async(action:'create'|'refresh'|'cash'|'receipt')=>{
  if(running.current||!loaded)return;running.current=true;generation.current++;setBusy(true);setError(null);
  try{
   if(action==='receipt')await service.recordCash(booking.id);
   else {
    const result=await service.checkout(booking.id,action);
    if(result.checkoutUrl){
     if(Platform.OS==='web')window.location.assign(result.checkoutUrl);
     else {const browser=await import('expo-web-browser');await browser.openBrowserAsync(result.checkoutUrl);}
    }
   }
   await load();
  }catch(cause){if(focused.current)setError(cause instanceof Error?cause.message:'Payment action could not be confirmed.');}
  finally{running.current=false;if(focused.current){setBusy(false);setConfirmCash(false);}}
 };
 return <View style={[styles.panel,{gap:12}]}>
  <Text style={styles.sectionTitle}>Payment</Text>
  {!loaded&&!error&&<Text style={styles.hint}>Loading payment information…</Text>}
  {loaded&&<>
   <Text style={styles.subtitle}>{summary.refundReview?'Payment received · refund review required':closed?'Booking closed':booking.status==='pending'?'Awaiting approval · no payment due yet':summary.basePaid?'Base rental paid':summary.active?'Online checkout pending':summary.testPaid?'Test payment successful · no money collected':'Base rental unpaid'}</Text>
   <Text style={styles.hint}>Paid: {dailyPrice(summary.paid/100)} · {summary.refundReview?'Contact the shop about the refund.':booking.status==='pending'?`Quoted base rental: ${dailyPrice(booking.total_centavos/100)}`:`Remaining balance: ${dailyPrice(summary.balance/100)}`}</Text>
   {rows.filter(p=>p.status==='paid').map(p=><Text key={p.id} style={styles.hint}>{p.livemode?'':'TEST · '}{p.provider==='cash'?'Cash received':'PayMongo verified'} · {dailyPrice(p.amount_centavos/100)}</Text>)}
   {!closed&&booking.status!=='pending'&&!summary.basePaid&&!summary.refundReview&&<Text style={styles.hint}>{summary.active?'Finish or close the existing checkout before paying cash.':'Cash on pickup is available. Online payment covers the full base rental after approval.'}</Text>}
   {booking.status==='completed'&&<Text style={styles.hint}>Any late charges are separate from the base rental. Arrange the remaining balance with the shop.</Text>}
   {!admin&&payable&&!summary.basePaid&&<>
    {process.env.EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED==='true'?<>
     <MotorFormButton title={summary.active?'Continue checkout':summary.testPaid?'Test payment completed':'Pay base rental online'} busy={busy} onPress={()=>void run('create')} />
     {summary.active&&<MotorFormButton title="Close checkout · pay cash instead" tone="outline" busy={busy} onPress={()=>void run('cash')} />}
     <Text style={styles.hint}>Available wallets/cards are shown on the provider checkout. Return here to check your verified payment status.</Text>
    </>:<Text style={styles.hint}>Online payments are not available yet. Please pay at pickup.</Text>}
   </>}
   {admin&&!summary.basePaid&&['approved','in_use','completed'].includes(booking.status)&&<>
    {confirmCash?<><Text style={styles.subtitle}>Confirm you physically received {dailyPrice(booking.total_centavos/100)} for the base rental. This does not collect money automatically.</Text><MotorFormButton title="Confirm cash received" busy={busy} onPress={()=>void run('receipt')} /><MotorFormButton title="Cancel" tone="outline" busy={busy} onPress={()=>setConfirmCash(false)} /></>:<MotorFormButton title="Record cash received" tone="outline" busy={busy} onPress={()=>setConfirmCash(true)} />}
   </>}
  </>}
  {error&&<Text accessibilityRole="alert" style={styles.saveError}>{error}</Text>}
  <MotorFormButton title="Refresh payment status" tone="outline" busy={busy} onPress={()=>{if(!loaded)void load();else if(!admin&&summary.active&&process.env.EXPO_PUBLIC_ONLINE_PAYMENTS_ENABLED==='true')void run('refresh');else void load();}} />
 </View>;
}

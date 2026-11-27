import type { SupabaseClient } from '@supabase/supabase-js';
export type Payment = { id:string;booking_id:string;client_id:string;provider:'cash'|'paymongo';livemode:boolean;amount_centavos:number;currency:'PHP';status:'creating'|'pending'|'paid'|'failed'|'expired';paid_at:string|null;created_at:string;recorded_by:string|null };
const COLUMNS='id,booking_id,client_id,provider,livemode,amount_centavos,currency,status,paid_at,created_at,recorded_by';
export function paymentSummary(rows: readonly Payment[], base: number, final: number, status: string) {
  const real=rows.filter(p=>p.status==='paid'&&p.livemode).reduce((sum,p)=>sum+p.amount_centavos,0);
  const testPaid=rows.some(p=>p.status==='paid'&&!p.livemode);
  const active=rows.some(p=>p.status==='creating'||p.status==='pending');
  const closed=['cancelled','rejected','no_show'].includes(status);
  return {paid:real,balance:closed?0:Math.max(0,final-real),testPaid,active,refundReview:closed&&real>0,basePaid:real>=base};
}
export function createPaymentService(client: SupabaseClient) {
  return {
    async list(bookingId:string):Promise<Payment[]> {
      const {data,error}=await client.from('payments').select(COLUMNS).eq('booking_id',bookingId).order('created_at',{ascending:false});
      if(error)throw new Error('Payment information is unavailable. Please refresh or contact the rental shop.');
      return (data??[]) as Payment[];
    },
    async checkout(bookingId:string,action:'create'|'refresh'|'cash'='create'):Promise<{checkoutUrl?:string;testMode?:boolean;paid?:boolean}> {
      const {data,error}=await client.functions.invoke('create-checkout',{body:{bookingId,action}});
      if(error || data?.error)throw new Error(data?.error||'Could not confirm checkout. Refresh payment status before trying again.');
      if(data?.checkoutUrl) {
        const url=new URL(data.checkoutUrl);
        if(url.protocol!=='https:'||url.hostname!=='checkout.paymongo.com'||url.username||url.password||url.port)throw new Error('Invalid checkout address. Contact the shop.');
      }
      return data??{};
    },
    async recordCash(bookingId:string) {
      const {error}=await client.rpc('record_booking_cash',{p_booking_id:bookingId});
      if(error)throw new Error('Cash collection could not be confirmed. Check for an active online checkout or an existing payment, then refresh.');
    },
  };
}

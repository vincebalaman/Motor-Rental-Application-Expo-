import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { createPaymentService, paymentSummary } from '../src/services/payments.ts';
import { verifySignature, settlement, webhookSession, checkoutUrl } from '../supabase/functions/_shared/paymongo.ts';
const row={id:'1',booking_id:'b',client_id:'c',provider:'paymongo',livemode:false,amount_centavos:150000,currency:'PHP',status:'paid',paid_at:'2026-11-27',created_at:'2026-11-27',recorded_by:null};
test('test settlements do not reduce real balances; late fees remain payable',()=>{
 assert.deepEqual(paymentSummary([row],150000,170000,'completed'),{paid:0,balance:170000,testPaid:true,active:false,refundReview:false,basePaid:false});
 const actual=paymentSummary([{...row,livemode:true}],150000,170000,'completed');assert.equal(actual.balance,20000);assert.equal(actual.basePaid,true);
 const cancelled=paymentSummary([{...row,livemode:true}],150000,150000,'cancelled');assert.equal(cancelled.refundReview,true);assert.equal(cancelled.balance,0);
});
const session={id:'cs_abc',attributes:{reference_number:'00000000-0000-0000-0000-000000000001',livemode:false,payments:[{id:'pay_abc',attributes:{status:'paid',amount:150000,currency:'PHP',livemode:false}}]}};
test('settlement requires exactly one successful PHP payment with the right mode',()=>{
 assert.equal(settlement(session,false).p_amount,150000);
 assert.throws(()=>settlement(session,true));
 for(const payments of [[],[...session.attributes.payments,...session.attributes.payments],[{id:'pay_x',attributes:{status:'paid',amount:150000,currency:'USD'}}]])assert.throws(()=>settlement({...session,attributes:{...session.attributes,payments}},false));
});
test('both PayMongo event envelopes are accepted but unrelated events cannot mark paid',()=>{
 assert.deepEqual(webhookSession({data:{type:'checkout_session.payment.paid',livemode:false,data:session}}),{session,livemode:false});
 assert.deepEqual(webhookSession({data:{attributes:{type:'checkout_session.payment.paid',livemode:false,data:session}}}),{session,livemode:false});
 assert.equal(webhookSession({data:{type:'payment.failed'}}),null);
 assert.throws(()=>webhookSession({data:{type:'checkout_session.payment.paid',data:session}}));
});
test('webhook signature verifies original bytes, correct mode, freshness and no duplicate fields',async()=>{
 const now=1800000000000,t=String(now/1000),raw=JSON.stringify({data:'original'}),secret='test-secret';
 const digest=createHmac('sha256',secret).update(`${t}.${raw}`).digest('hex');
 const header=`t=${t},te=${digest},li=`;
 assert.equal(await verifySignature(raw,header,secret,false,now),true);
 assert.equal(await verifySignature(raw+' ',header,secret,false,now),false);
 assert.equal(await verifySignature(raw,header,'wrong',false,now),false);
 assert.equal(await verifySignature(raw,header,secret,true,now),false);
 assert.equal(await verifySignature(raw,header,secret,false,now+301000),false);
 assert.equal(await verifySignature(raw,header+`,t=${t}`,secret,false,now),false);
});
test('checkout URL validation forbids lookalikes and credential-bearing URLs',()=>{
 assert.equal(checkoutUrl('https://checkout.paymongo.com/cs_abc#key'),'https://checkout.paymongo.com/cs_abc#key');
 for(const value of ['http://checkout.paymongo.com/a','https://checkout.paymongo.com.attacker.test/a','https://user@checkout.paymongo.com/a','javascript:alert(1)'])assert.throws(()=>checkoutUrl(value));
});
test('client sends only booking ID/action, never a client-selected price or paid flag',async()=>{
 const calls=[];const service=createPaymentService({functions:{invoke:async(name,args)=>{calls.push([name,args]);return{data:{checkoutUrl:'https://checkout.paymongo.com/test',testMode:true},error:null};}}});
 assert.equal((await service.checkout('booking')).testMode,true);
 assert.deepEqual(calls,[['create-checkout',{body:{bookingId:'booking',action:'create'}}]]);
});

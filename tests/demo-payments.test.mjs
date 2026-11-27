import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoPaymentService, demoCanPay } from '../src/services/demo-payments.ts';
const now=Date.parse('2026-11-27T04:00:00Z');
const booking={id:'booking-a',client_id:'client-a',status:'approved',total_centavos:150000,pickup_date:'2026-11-28',scheduled_pickup_at:'2026-11-28T04:00:00Z'};
function fixture(){const values=new Map();const calls=[];const storage={getItem:async key=>values.get(key)??null,setItem:async(key,value)=>{calls.push(['save',key]);values.set(key,value);},removeItem:async key=>{calls.push(['remove',key]);values.delete(key);}};return{values,calls,service:createDemoPaymentService(storage,()=>now)};}
test('educational success saves only a demo receipt without requiring any backend client',async()=>{
 const {service,calls}=fixture();const receipt=await service.simulate(booking,'gcash','success');
 assert.equal(receipt.demo,true);assert.match(receipt.reference,/^DEMO-/);assert.equal(receipt.amount,150000);assert.equal(receipt.outcome,'success');
 assert.deepEqual(await service.load(booking),receipt);assert.equal(calls.length,1);
 assert.equal(Object.hasOwn(receipt,'paid_at'),false);assert.equal(Object.hasOwn(receipt,'provider_payment_id'),false);
});
test('decline and cancellation are repeatable demo outcomes, not booking changes',async()=>{
 const {service}=fixture();for(const outcome of ['failed','cancelled']){await service.simulate(booking,'maya',outcome);assert.equal((await service.load(booking)).outcome,outcome);assert.equal(booking.status,'approved');}
 await service.simulate(booking,'card','success');assert.equal((await service.load(booking)).outcome,'success');
 await service.reset(booking);assert.equal(await service.load(booking),null);
});
test('demo records are scoped to client and booking; changed prices cannot reuse a receipt',async()=>{
 const {service}=fixture();await service.simulate(booking,'card','success');
 for(const other of [{...booking,id:'booking-b'},{...booking,client_id:'client-b'},{...booking,total_centavos:1}])assert.equal(await service.load(other),null);
});
test('pending/closed/past bookings cannot be simulated as successfully payable',async()=>{
 const {service,calls}=fixture();
 for(const status of ['pending','cancelled','completed','rejected','no_show','in_use'])await assert.rejects(service.simulate({...booking,status},'gcash','success'));
 await assert.rejects(service.simulate({...booking,scheduled_pickup_at:new Date(now).toISOString()},'gcash','success'));
 assert.equal(calls.length,0);assert.equal(demoCanPay(booking,now),true);
});
test('corrupt receipts do not display fake success and storage failures are not reported as success',async()=>{
 const {service,values}=fixture();await service.simulate(booking,'gcash','success');const key=[...values.keys()][0];
 for(const value of ['{broken',JSON.stringify({demo:false,outcome:'success'}),JSON.stringify({demo:true,reference:'REAL',bookingId:booking.id})]){values.set(key,value);assert.equal(await service.load(booking),null);}
 const failing=createDemoPaymentService({getItem:async()=>null,setItem:async()=>{throw new Error('full');},removeItem:async()=>{}},()=>now);
 await assert.rejects(failing.simulate(booking,'card','success'),/full/);
});

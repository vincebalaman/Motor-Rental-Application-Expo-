import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminDashboardService, parseAdminView, parseDashboardDate } from '../src/services/admin-dashboard.ts';
import { createBookingService } from '../src/services/bookings.ts';
test('summary uses the guarded server aggregate and preserves zero and large counts', async () => {
  const row = { today:'2026-11-21',pending:1001,pickups_today:0,returns_today:1,in_use:3,overdue:2 };
  const service=createAdminDashboardService({ rpc: async name => { assert.equal(name,'admin_booking_summary'); return { data:[row],error:null }; } });
  assert.deepEqual(await service.summary(),row);
});
test('malformed or failed summary is never displayed as a zero activity day', async () => {
  const good={ today:'2026-11-21',pending:0,pickups_today:0,returns_today:0,in_use:0,overdue:0 };
  for(const data of [null,[],[good,good],[{...good,pending:-1}],[{...good,overdue:'2'}],[{...good,today:'2026-02-30'}]]) await assert.rejects(createAdminDashboardService({rpc:async()=>({data,error:null})}).summary());
  await assert.rejects(createAdminDashboardService({rpc:async()=>({data:null,error:Error('offline')})}).summary());
});
test('route views and dates are validated before selecting an operations queue', () => {
  assert.equal(parseAdminView('returns_today'),'returns_today');
  assert.equal(parseAdminView('all'),null);
  assert.equal(parseAdminView('in_use'),'in_use');
  for(const value of [undefined,['pending'],'anything','toString']) assert.equal(parseAdminView(value),'pending');
  assert.equal(parseDashboardDate('2028-02-29'),'2028-02-29');
  for(const date of ['2026-02-30','bad',['2026-11-21']]) assert.equal(parseDashboardDate(date),undefined);
});
test('operations queue predicates match summary definitions before pagination', async () => {
  for(const [view,expected] of [
    ['pickups_today',[['eq','status','approved'],['eq','pickup_date','2026-11-21']]],
    ['returns_today',[['eq','status','in_use'],['eq','return_date','2026-11-21']]],
    ['overdue',[['eq','status','in_use'],['lte','return_date','2026-11-21']]],
  ]) {
    const calls=[];
    const query={select:()=>query,order:()=>query,eq:(...args)=>{calls.push(['eq',...args]);return query;},lte:(...args)=>{calls.push(['lte',...args]);return query;},range:async(...args)=>{calls.push(['range',...args]);return {data:[],error:null};}};
    await createBookingService({from:()=>query}).listAdmin(view,50,'2026-11-21');
    assert.deepEqual(calls,[...expected,['range',50,99]]);
  }
});

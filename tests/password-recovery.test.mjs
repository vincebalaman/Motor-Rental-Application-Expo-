import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './auth' && context.parentURL?.endsWith('/services/password-recovery.ts')) return next('./auth.ts', context);
  return next(specifier, context);
} });
const { createPasswordRecoveryService, parseRecoveryCallback, recoveryErrorMessage } = await import('../src/services/password-recovery.ts');
function fixture(flow = 'recovery') {
  const calls = [];
  const auth = {
    resetPasswordForEmail: async (...args) => { calls.push(['request', ...args]); return { error: null }; },
    exchangeCodeForSession: async (...args) => { calls.push(['exchange', ...args]); return { data: { session: { user: { id: 'a' } }, redirectType: flow }, error: null }; },
    getUser: async () => ({ data: { user: { id: 'a' } }, error: null }),
    updateUser: async (...args) => { calls.push(['update', ...args]); return { error: null }; },
    signOut: async (...args) => { calls.push(['signOut', ...args]); return { error: null }; },
  };
  return { auth, calls, service: createPasswordRecoveryService({ auth }) };
}
test('reset request normalizes email and supplies callback', async () => {
  const { service, calls } = fixture();
  await service.request(' A@Example.com ', 'motorrentalexpo://auth/reset-password');
  assert.deepEqual(calls[0], ['request', 'a@example.com', { redirectTo: 'motorrentalexpo://auth/reset-password' }]);
  await assert.rejects(service.request('bad', 'https://example.com'));
});
test('callback rejects missing codes, duplicate params, errors, and implicit tokens', () => {
  for (const params of [{}, { code: ['a', 'b'] }, { code: 'a', error: 'expired' }, { code: 'a', access_token: 'x' }, { code: 'a', sb_flow_id: ['x'] }]) assert.throws(() => parseRecoveryCallback(params));
  assert.deepEqual(parseRecoveryCallback({ code: 'a', sb_flow_id: 'flow' }), { code: 'a', flowId: 'flow' });
});
test('repeated callback exchanges once and passes PKCE flow ID', async () => {
  const { service, calls } = fixture();
  await Promise.all([service.exchange({ code: 'a', flowId: 'f' }), service.exchange({ code: 'a', flowId: 'f' })]);
  assert.deepEqual(calls, [['exchange', 'a', { flowId: 'f' }]]);
});
test('ordinary login flow cannot authorize recovery', async () => {
  const { service, calls } = fixture('signin');
  await assert.rejects(service.exchange({ code: 'a' }));
  await assert.rejects(service.updatePassword('password123', 'password123'));
  assert.equal(calls.some(call => call[0] === 'update'), false);
});
test('stored session alone cannot authorize recovery', async () => {
  await assert.rejects(fixture().service.updatePassword('password123', 'password123'));
});
test('changed identity prevents password update', async () => {
  const { service, auth, calls } = fixture();
  await service.exchange({ code: 'a' });
  auth.getUser = async () => ({ data: { user: { id: 'b' } }, error: null });
  await assert.rejects(service.updatePassword('password123', 'password123'));
  assert.equal(calls.some(call => call[0] === 'update'), false);
});
test('valid recovery validates password then updates once and revokes sessions', async () => {
  const { service, calls } = fixture();
  await service.exchange({ code: 'a' });
  await assert.rejects(service.updatePassword('short', 'short'));
  await assert.rejects(service.updatePassword('password123', 'different'));
  await service.updatePassword('password123', 'password123');
  await assert.rejects(service.updatePassword('another123', 'another123'));
  await service.finish();
  assert.deepEqual(calls.slice(1), [['update', { password: 'password123' }], ['signOut', { scope: 'global' }]]);
});
test('cancel removes authorization and closes only recovery session', async () => {
  const { service, calls } = fixture();
  await service.exchange({ code: 'a' }); await service.cancel();
  await assert.rejects(service.updatePassword('password123', 'password123'));
  assert.deepEqual(calls.at(-1), ['signOut', { scope: 'local' }]);
});
test('expired exchanges fail safely and server messages are not exposed', async () => {
  const { service, auth } = fixture();
  auth.exchangeCodeForSession = async () => ({ data: {}, error: { code: 'flow_state_expired', message: 'private' } });
  await assert.rejects(service.exchange({ code: 'expired' }));
  assert.match(recoveryErrorMessage({ code: 'flow_state_expired' }), /expired/);
  assert.doesNotMatch(recoveryErrorMessage(new Error('secret')), /secret/);
});

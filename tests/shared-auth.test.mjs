import assert from 'node:assert/strict';
import test from 'node:test';

import { authErrorMessage, createAuthService, withAuthTimeout } from '../src/services/auth.ts';

function fixture({ role = 'client', identityId = 'user-1', profileError = null, roleError = null } = {}) {
  const calls = [];
  const client = {
    auth: {
      signInWithPassword: async (input) => { calls.push(['login', input]); return { error: null }; },
      signUp: async (input) => { calls.push(['signup', input]); return { data: { session: null }, error: null }; },
      getUser: async () => ({ data: { user: { id: identityId, email: 'rider@example.com', user_metadata: { role: 'admin' } } }, error: null }),
    },
    from(table) {
      return {
        select() { return this; },
        eq(column, value) { calls.push([table, column, value]); return this; },
        async single() {
          return table === 'profiles'
            ? { data: { full_name: 'Test Rider' }, error: profileError }
            : { data: role === null ? null : { role }, error: roleError };
        },
      };
    },
  };
  return { client, calls, service: createAuthService(client) };
}

const session = { user: { id: 'user-1' } };

test('shared login normalizes email and preserves the exact password', async () => {
  const { service, calls } = fixture();
  await service.signIn(' RIDER@Example.com ', ' Password123 ');
  assert.deepEqual(calls, [['login', { email: 'rider@example.com', password: ' Password123 ' }]]);
});

test('signup sends name metadata and reports email confirmation without assigning a role', async () => {
  const { service, calls, client } = fixture();
  assert.deepEqual(await service.register(' Test Rider ', ' RIDER@example.com ', 'Password123'), { needsEmailConfirmation: true });
  assert.deepEqual(calls[0][1], { email: 'rider@example.com', password: 'Password123', options: { data: { full_name: 'Test Rider' } } });
  client.auth.signUp = async () => ({ data: { session }, error: null });
  assert.deepEqual(await service.register('Test Rider', 'rider@example.com', 'Password123'), { needsEmailConfirmation: false });
});

test('identity is validated and role comes from the protected role table, never signup metadata', async () => {
  const { service, calls } = fixture();
  assert.deepEqual(await service.loadUser(session), { id: 'user-1', email: 'rider@example.com', fullName: 'Test Rider', role: 'client' });
  assert.deepEqual(calls, [['profiles', 'id', 'user-1'], ['user_roles', 'user_id', 'user-1']]);
  assert.equal((await fixture({ role: 'admin' }).service.loadUser(session)).role, 'admin');
});

test('missing, invalid, or unreadable roles fail closed', async () => {
  for (const role of [null, 'owner', '']) {
    await assert.rejects(fixture({ role }).service.loadUser(session), /Account setup is incomplete/);
  }
  await assert.rejects(fixture({ roleError: new Error('Role access denied') }).service.loadUser(session), /Role access denied/);
});

test('a changed identity cannot hydrate the previous account', async () => {
  const { service, calls } = fixture({ identityId: 'user-2' });
  await assert.rejects(service.loadUser(session), /session changed/);
  assert.deepEqual(calls, []);
});

test('authentication failures propagate and UI messages do not expose backend details', async () => {
  const { client, service } = fixture();
  client.auth.signInWithPassword = async () => ({ error: { code: 'invalid_credentials', message: 'private diagnostic' } });
  await assert.rejects(service.signIn('rider@example.com', 'bad'), error => error.code === 'invalid_credentials');
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /Confirm your email/);
  assert.equal(authErrorMessage(new Error('private diagnostic')).includes('private'), false);
});

test('session operation deadline reports stalled work instead of an endless spinner', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const rejected = assert.rejects(withAuthTimeout(new Promise(() => {})), /took too long/);
  t.mock.timers.tick(20_001);
  await rejected;
});

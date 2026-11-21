import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfileService, profileErrorMessage, profilePayload } from '../src/services/profile.ts';
test('profile trims names and preserves international names and phone leading zeros', () => {
  assert.deepEqual(profilePayload('  José   Dela Cruz  ', '0917 123-4567'), { full_name: 'José Dela Cruz', phone: '09171234567' });
  assert.deepEqual(profilePayload('李 明', '+63 (917) 123-4567'), { full_name: '李 明', phone: '+639171234567' });
});
test('empty optional phone removes saved number', () => {
  assert.deepEqual(profilePayload('Rider Name','  '), { full_name: 'Rider Name', phone: null });
});
test('invalid names and malformed phones fail before any server write', () => {
  for (const name of ['', 'x', 'x'.repeat(121), 'Rider\nName']) assert.throws(() => profilePayload(name, ''));
  for (const phone of ['123', '+'.repeat(2)+'639171234567', '0917text1234', '1'.repeat(16), '1234567 ext 1', '---']) assert.throws(() => profilePayload('Rider Name', phone));
});
function fixture(identity = 'owner', response = { id: 'owner', full_name: 'Updated Rider', phone: '+639171234567' }) {
  const calls = [];
  const query = {
    update: payload => { calls.push(['update', payload]); return query; },
    eq: (...args) => { calls.push(['eq', ...args]); return query; },
    select: fields => { calls.push(['select', fields]); return query; },
    single: async () => ({ data: response, error: null }),
  };
  const service = createProfileService({ auth: { getUser: async () => ({ data: { user: identity ? { id: identity } : null }, error: null }) }, from: name => { calls.push(['from', name]); return query; } });
  return { service, calls };
}
test('save updates only allowed fields on the validated owner and uses confirmed server row', async () => {
  const { service, calls } = fixture();
  const result = await service.update('owner', 'Updated Rider', '+63 917 123 4567');
  assert.equal(result.full_name, 'Updated Rider');
  assert.deepEqual(calls, [['from', 'profiles'], ['update', { full_name: 'Updated Rider', phone: '+639171234567' }], ['eq', 'id', 'owner'], ['select', 'id,full_name,phone']]);
});
test('a changed or absent identity never issues a table update', async () => {
  for (const identity of ['other', null]) {
    const { service, calls } = fixture(identity);
    await assert.rejects(service.update('owner','Updated Rider',''));
    assert.equal(calls.length,0);
  }
});
test('invalid draft does not call the database', async () => {
  const { service, calls } = fixture();
  await assert.rejects(service.update('owner','x','123'));
  assert.equal(calls.length,0);
});
test('missing or mismatched write confirmation cannot report success', async () => {
  for (const response of [null, { id: 'other', full_name: 'Wrong', phone: null }, { id: 'owner', full_name: null, phone: null }]) await assert.rejects(fixture('owner',response).service.update('owner','Updated Rider',''));
});
test('unexpected errors are safe and retain retry guidance', () => {
  assert.doesNotMatch(profileErrorMessage(new Error('private backend token')), /private backend token/);
  assert.match(profileErrorMessage(new Error('offline')), /entries are still here/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { createProfilePhotoService } from '../src/services/profile-photos.ts';
const owner = '00000000-0000-0000-0000-000000000001';
const selection = '10000000-0000-0000-0000-000000000001';
const bytes = Uint8Array.from([255,216,255,217]).buffer;
function fixture({ identity = owner, uploadError = null, saveError = null, signError = null } = {}) {
  const calls = [];
  const service = createProfilePhotoService({
    auth: { getUser: async () => ({ data: { user: { id: identity } }, error: null }) },
    storage: { from(bucket) { return {
      upload: async (...args) => { calls.push(['upload', bucket, ...args]); return { error: uploadError }; },
      createSignedUrl: async (...args) => { calls.push(['sign', bucket, ...args]); return { data: { signedUrl: 'https://example.com/private' }, error: signError }; },
    }; } },
    from(table) { return { upsert: async (...args) => { calls.push(['save', table, ...args]); return { error: saveError }; } }; },
  });
  return { service, calls };
}
test('profile upload verifies identity and saves a stable private owner path', async () => {
  const { service, calls } = fixture();
  assert.equal(await service.save(owner, selection, bytes), 'https://example.com/private');
  assert.deepEqual(calls[0], ['upload', 'profile-images', `${owner}/${selection}.jpg`, bytes, { contentType: 'image/jpeg', upsert: true }]);
  assert.deepEqual(calls[1], ['save', 'profile_photos', { user_id: owner, image_path: `${owner}/${selection}.jpg` }, { onConflict: 'user_id' }]);
  await service.save(owner, selection, bytes);
  assert.equal(calls[3][2], calls[0][2]);
});
test('changed identity and corrupt or oversized files cannot upload', async () => {
  const { service, calls } = fixture({ identity: 'other' });
  await assert.rejects(service.save(owner, selection, bytes), /session changed/);
  await assert.rejects(service.save('../other', selection, bytes));
  await assert.rejects(service.save(owner, selection, new ArrayBuffer(5242881)));
  await assert.rejects(service.save(owner, selection, Uint8Array.from([1,2,3]).buffer));
  assert.equal(calls.length, 0);
});
test('failed upload does not change the saved profile photo reference', async () => {
  const { service, calls } = fixture({ uploadError: {} });
  await assert.rejects(service.save(owner, selection, bytes), /could not upload/);
  assert.equal(calls.some(call => call[0] === 'save'), false);
});
test('a failed profile write is reported without deleting possibly committed images', async () => {
  const { service } = fixture({ saveError: {} });
  await assert.rejects(service.save(owner, selection, bytes), /could not confirm/);
});
test('image signing failure does not report a committed photo change as failed', async () => {
  const { service } = fixture({ signError: {} });
  assert.equal(await service.save(owner, selection, bytes), '');
});

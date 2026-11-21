import assert from 'node:assert/strict';
import test from 'node:test';
import { photoBytes, uploadMotorPhoto } from '../src/services/motor-photos.ts';
const admin = '3195548f-c2ab-48ef-8d74-ec68c3c9a2b0';
const photo = { id: '4195548f-c2ab-48ef-8d74-ec68c3c9a2b0', uri: 'file:///preview.jpg', base64: '/9j/2Q==' };
function fixture(error = null) {
  const calls = [];
  const client = { storage: { from(bucket) { return { async upload(...args) { calls.push({ bucket, args }); return { error }; } }; } } };
  return { client, calls };
}
test('uploads JPEG bytes to a private, owner-scoped unique path and retries the same selection safely', async () => {
  const { client, calls } = fixture();
  const path = await uploadMotorPhoto(client, admin, photo);
  assert.equal(path, `motors/uploads/${admin}/${photo.id}.jpg`);
  assert.equal(await uploadMotorPhoto(client, admin, photo), path);
  assert.equal(calls[0].bucket, 'motor-images');
  assert.deepEqual(new Uint8Array(calls[0].args[1]), new Uint8Array([255, 216, 255, 217]));
  assert.deepEqual(calls[0].args[2], { contentType: 'image/jpeg', upsert: true });
  const replacement = await uploadMotorPhoto(client, admin, { ...photo, id: '5195548f-c2ab-48ef-8d74-ec68c3c9a2b0' });
  assert.notEqual(path, replacement);
});
test('invalid identities, corrupt images and oversized photos fail before upload', async () => {
  const { client, calls } = fixture();
  await assert.rejects(uploadMotorPhoto(client, '../admin', photo));
  await assert.rejects(uploadMotorPhoto(client, admin, { ...photo, id: '../../old-photo' }));
  for (const base64 of ['', 'not an image', 'aGVsbG8=', 'A'.repeat(6990512)]) {
    assert.throws(() => photoBytes(base64));
    await assert.rejects(uploadMotorPhoto(client, admin, { ...photo, base64 }));
  }
  assert.equal(calls.length, 0);
});
test('storage denial or a failed upload prevents returning a usable photo path', async () => {
  const { client } = fixture({ message: 'new row violates row-level security policy' });
  await assert.rejects(uploadMotorPhoto(client, admin, photo), /could not be uploaded/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { createInventoryService, inventoryErrorMessage, motorPayload } from '../src/services/inventory.ts';

const row = {
  id: '3195548f-c2ab-48ef-8d74-ec68c3c9a2b0', name: 'City Scooter', type: 'Scooter',
  description: 'A city ride', daily_rate_centavos: 150050, image_path: 'motors/scooter.jpg',
  updated_at: '2026-11-17T01:00:00Z',
};
const input = { name: ' City Scooter ', type: 'Scooter', description: 'A city ride', price: 1500.50, imagePath: 'motors/scooter.jpg' };

function fixture(responses, signing = { data: [{ path: row.image_path, signedUrl: 'https://example.com/signed.jpg', error: null }], error: null }) {
  const calls = [];
  const client = {
    from(table) {
      calls.push(['from', table]);
      const query = {};
      for (const method of ['select', 'is', 'order', 'insert', 'update', 'eq']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
      }
      query.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
      query.single = () => { calls.push(['single']); return query; };
      query.maybeSingle = () => { calls.push(['maybeSingle']); return query; };
      return query;
    },
    storage: {
      from(bucket) {
        return { async createSignedUrls(paths, seconds) {
          calls.push(['sign', bucket, paths, seconds]);
          if (signing instanceof Error) throw signing;
          return signing;
        } };
      },
    },
  };
  return { service: createInventoryService(client), calls };
}

test('shared inventory reads active rows, keeps UUIDs, converts centavos and signs private images', async () => {
  const { service, calls } = fixture([{ data: [row], error: null }]);
  const [motor] = await service.list();
  assert.equal(motor.id, row.id);
  assert.equal(motor.price, 1500.50);
  assert.equal(motor.imagePath, row.image_path);
  assert.equal(motor.imageUrl, 'https://example.com/signed.jpg');
  assert.ok(calls.some(call => call[0] === 'is' && call[1] === 'archived_at' && call[2] === null));
  assert.deepEqual(calls.find(call => call[0] === 'sign'), ['sign', 'motor-images', [row.image_path], 3600]);
});

test('HTTPS URLs remain usable without requesting private storage signing', async () => {
  const image = 'https://example.com/motor.jpg';
  const { service, calls } = fixture([{ data: [{ ...row, image_path: image }], error: null }]);
  assert.equal((await service.list())[0].imageUrl, image);
  assert.equal(calls.some(call => call[0] === 'sign'), false);
});

test('missing photos do not turn a committed create into an apparent failed save', async () => {
  const { service, calls } = fixture([{ data: row, error: null }], new Error('Storage temporarily unavailable'));
  const motor = await service.create(input);
  assert.equal(motor.id, row.id);
  assert.equal(motor.imageUrl, '');
  assert.deepEqual(calls.find(call => call[0] === 'insert')[1], {
    name: 'City Scooter', type: 'Scooter', description: 'A city ride', daily_rate_centavos: 150050, image_path: row.image_path,
  });
});

test('fractional centavos, invalid prices, oversized fields, and unsafe image paths fail before writing', async () => {
  const { service, calls } = fixture([]);
  for (const price of [0, -1, Infinity, NaN, 10.001, 1000000.01]) {
    await assert.rejects(service.create({ ...input, price }));
  }
  for (const imagePath of ['http://example.com/a.jpg', '../private.jpg', '/absolute.jpg', 'javascript:alert(1)', '']) {
    assert.throws(() => motorPayload({ ...input, imagePath }));
  }
  assert.throws(() => motorPayload({ ...input, name: 'a'.repeat(121) }));
  assert.equal(calls.some(call => call[0] === 'insert'), false);
  assert.equal(motorPayload({ ...input, price: 0.01 }).daily_rate_centavos, 1);
});

test('update checks the original version and rejects changes made by another admin', async () => {
  const { service, calls } = fixture([{ data: null, error: null }]);
  await assert.rejects(service.update(row.id, input, row.updated_at), /changed or is no longer available/);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'updated_at' && call[2] === row.updated_at));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'id' && call[2] === row.id));
});

test('delete archives a versioned shared row rather than permanently deleting it', async () => {
  const { service, calls } = fixture([{ data: { id: row.id }, error: null }]);
  await service.archive(row.id, row.updated_at);
  const payload = calls.find(call => call[0] === 'update')[1];
  assert.equal(typeof payload.archived_at, 'string');
  assert.ok(Number.isFinite(Date.parse(payload.archived_at)));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'updated_at'));
});

test('backend write errors propagate without leaking diagnostics to the UI', async () => {
  const { service } = fixture([{ data: null, error: new Error('private database diagnostic') }]);
  await assert.rejects(service.create(input), /private database diagnostic/);
  assert.equal(inventoryErrorMessage(new Error('private database diagnostic')).includes('private'), false);
});

import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { readLocalImport } from '../src/database/local-import.ts';
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './inventory' && context.parentURL.endsWith('/services/local-import.ts')) {
    return { url: new URL('./inventory.ts', context.parentURL).href, shortCircuit: true };
  }
  return next(specifier, context);
} });
const { createLocalImportService, importErrorMessage } = await import('../src/services/local-import.ts');

function sqlite() {
  const connection = new DatabaseSync(':memory:');
  return {
    connection,
    execAsync: async sql => { connection.exec(sql); },
    getFirstAsync: async (sql, ...args) => connection.prepare(sql).get(...args) ?? null,
    getAllAsync: async (sql, ...args) => connection.prepare(sql).all(...args),
    runAsync: async (sql, ...args) => connection.prepare(sql).run(...args),
  };
}
const motor = { id: 7, name: 'Local Scooter', type: 'Scooter', description: 'Local ride', price: 1500.50, imageUrl: 'https://example.com/a.jpg' };

test('a device with no catalog is not seeded by the preview', async () => {
  const database = sqlite();
  try {
    assert.deepEqual(await readLocalImport(database), { sourceId: null, motors: [] });
    assert.equal(await database.getFirstAsync("select name from sqlite_master where name = 'motors'"), null);
  } finally { database.connection.close(); }
});

test('preview excludes deleted motors, preserves data, and persists a stable import source identity', async () => {
  const database = sqlite();
  try {
    await database.execAsync("create table motors (id integer primary key, name text, type text, description text, price real, image_url text, deleted_at text)");
    await database.runAsync('insert into motors values (?,?,?,?,?,?,?)',motor.id,motor.name,motor.type,motor.description,motor.price,motor.imageUrl,null);
    await database.runAsync('insert into motors values (?,?,?,?,?,?,?)',8,'Archived','Sport','Old',100,motor.imageUrl,'2026-01-01');
    const before = await database.getAllAsync('select * from motors order by id');
    const first = await readLocalImport(database);
    const second = await readLocalImport(database);
    assert.match(first.sourceId, /^[0-9a-f]{32}$/);
    assert.equal(first.sourceId, second.sourceId);
    assert.deepEqual(first.motors.map(row => ({ ...row })), [motor]);
    assert.deepEqual(await database.getAllAsync('select * from motors order by id'), before);
  } finally { database.connection.close(); }
});

test('import uses the atomic RPC with the stable source key and exact centavo price', async () => {
  const calls = [];
  const service = createLocalImportService({ rpc: async (name, args) => { calls.push({name,args}); return { data: 'cloud-motor-uuid', error: null }; } });
  assert.equal(await service.importMotor('a'.repeat(32),motor), 'cloud-motor-uuid');
  assert.equal(calls[0].name, 'import_local_motor');
  assert.equal(calls[0].args.p_source_id, 'a'.repeat(32));
  assert.equal(calls[0].args.p_local_motor_id, 7);
  assert.equal(calls[0].args.p_daily_rate_centavos, 150050);
  assert.equal(calls[0].args.p_image_url, motor.imageUrl);
});

test('invalid local data never triggers a remote write', async () => {
  let calls = 0;
  const service = createLocalImportService({ rpc: async () => { calls++; } });
  await assert.rejects(service.importMotor('bad',motor));
  await assert.rejects(service.importMotor('a'.repeat(32),{ ...motor, price: 0 }));
  await assert.rejects(service.importMotor('a'.repeat(32),{ ...motor, imageUrl: 'file:///local.jpg' }));
  assert.equal(calls,0);
});

test('missing migration and permission failures give actionable import messages', () => {
  assert.match(importErrorMessage({ code: 'PGRST202' }), /migration/);
  assert.match(importErrorMessage({ code: '42501' }), /Admin role/);
  assert.match(importErrorMessage(new Error("Cannot find native module 'ExpoSQLite'")), /Rebuild and reinstall/);
  assert.equal(importErrorMessage(new Error('private diagnostic')).includes('private'),false);
});

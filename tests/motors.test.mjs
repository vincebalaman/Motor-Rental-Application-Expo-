import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from './helpers/sqlite.mjs';
import test from 'node:test';

import { getMotors, initializeMotorDatabase, insertMotor, removeMotor, saveMotor } from '../src/database/motors.ts';


const input = {
  name: "  Rider's Scooter  ", type: 'Scooter', price: 1500.50,
  description: 'A city ride.', imageUrl: 'https://example.com/motor.jpg',
};

test('inventory survives reopening and initialization preserves accounts and edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'motor-inventory-'));
  const path = join(directory, 'rental.db');
  let database = openDatabase(path);
  try {
    await database.execAsync("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT); INSERT INTO users VALUES (1, 'rider@example.com');");
    await initializeMotorDatabase(database);
    assert.equal((await getMotors(database)).length, 5);
    const created = await insertMotor(database, input);
    assert.equal(created.name, "Rider's Scooter");
    assert.equal(created.price, 1500.50);
    const edited = await saveMotor(database, 1, { ...input, name: 'Updated Honda' });
    await removeMotor(database, 2);
    database.close();
    database = openDatabase(path);
    await initializeMotorDatabase(database);
    const motors = await getMotors(database);
    assert.equal(motors.length, 5);
    assert.deepEqual({ ...motors.find((motor) => motor.id === created.id) }, created);
    assert.deepEqual({ ...motors.find((motor) => motor.id === 1) }, edited);
    assert.equal(motors.some((motor) => motor.id === 2), false);
    assert.equal((await database.getFirstAsync('SELECT email FROM users WHERE id = 1')).email, 'rider@example.com');
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('an empty catalog stays empty and deleted records cannot be edited', async () => {
  const database = openDatabase();
  try {
    await initializeMotorDatabase(database);
    for (const motor of await getMotors(database)) await removeMotor(database, motor.id);
    await initializeMotorDatabase(database);
    assert.deepEqual(await getMotors(database), []);
    await assert.rejects(saveMotor(database, 1, input), /Motor not found/);
    await assert.rejects(removeMotor(database, 1), /Motor not found/);
    await assert.rejects(saveMotor(database, 999, input), /Motor not found/);
    const [first, second] = await Promise.all([insertMotor(database, input), insertMotor(database, input)]);
    assert.ok(first.id > 5);
    assert.notEqual(first.id, second.id);
  } finally {
    database.close();
  }
});

test('invalid writes fail without changing existing inventory', async () => {
  const database = openDatabase();
  try {
    await initializeMotorDatabase(database);
    const before = await getMotors(database);
    for (const price of [0, -1, NaN, Infinity]) {
      await assert.rejects(insertMotor(database, { ...input, price }));
      await assert.rejects(saveMotor(database, 1, { ...input, price }));
    }
    await assert.rejects(insertMotor(database, { ...input, name: '   ' }));
    assert.deepEqual(await getMotors(database), before);
  } finally {
    database.close();
  }
});

test('interrupted first-time seeding rolls back and can be retried', async () => {
  const database = openDatabase();
  const originalRun = database.runAsync;
  let inserts = 0;
  database.runAsync = async (...args) => {
    if (++inserts === 3) throw new Error('Simulated disk write failure');
    return originalRun(...args);
  };
  try {
    await assert.rejects(initializeMotorDatabase(database), /disk write failure/);
    database.runAsync = originalRun;
    await initializeMotorDatabase(database);
    assert.equal((await getMotors(database)).length, 5);
    await initializeMotorDatabase(database);
    assert.equal((await getMotors(database)).length, 5);
  } finally {
    database.close();
  }
});

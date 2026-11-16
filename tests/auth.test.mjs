import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { pbkdf2Sync } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { openDatabase } from './helpers/sqlite.mjs';

// Use Node's secure RNG in place of the native Expo bridge. Hashing and SQL are real.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'expo-crypto') {
      return {
        url: 'data:text/javascript,export async function getRandomBytesAsync(size) { return crypto.getRandomValues(new Uint8Array(size)); }',
        shortCircuit: true,
      };
    }
    if (specifier === '../security/password' && context.parentURL.endsWith('/database/auth.ts')) {
      return { url: new URL('../security/password.ts', context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

const { hashPassword, verifyPassword } = await import('../src/security/password.ts');
const { initializeDatabase, createUser, loginUser, getCurrentUser, logoutUser } = await import('../src/database/auth.ts');
const password = ' Ride\u{1f3cd}Password123 ';

const legacySchema = `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE auth_session (
    id INTEGER PRIMARY KEY CHECK (id = 1), user_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`;

test('hashes use unique salts, match Node PBKDF2, and reject incorrect or malformed credentials', async () => {
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  const [algorithm, iterations, salt, key] = first.split('$');
  assert.equal(algorithm, 'pbkdf2-sha256');
  assert.equal(iterations, '600000');
  assert.equal(key, pbkdf2Sync(password, Buffer.from(salt, 'hex'), 600_000, 32, 'sha256').toString('hex'));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword(password.trim(), first), false);
  for (const malformed of [password, '', 'pbkdf2-sha256$1$aa$bb', first + '$extra', first.replace('600000', '999999999')]) {
    assert.equal(await verifyPassword(password, malformed), false);
  }
});

test('registration stores only hashes; login, session restoration and logout work', async () => {
  const database = openDatabase();
  try {
    await initializeDatabase(database);
    await createUser(database, '  Test Rider ', ' RIDER@example.com ', password);
    const row = await database.getFirstAsync('SELECT * FROM users');
    assert.equal('password' in row, false);
    assert.notEqual(row.password_hash, password);
    assert.equal(row.password_version, 1);
    assert.equal(await loginUser(database, 'rider@example.com', 'wrong'), null);
    assert.equal(await loginUser(database, 'unknown@example.com', password), null);
    assert.equal(await getCurrentUser(database), null);
    const user = await loginUser(database, ' RIDER@example.com ', password);
    assert.deepEqual(user, { id: row.id, fullName: 'Test Rider', email: 'rider@example.com' });
    assert.deepEqual({ ...await getCurrentUser(database) }, user);
    await assert.rejects(createUser(database, 'Duplicate', 'RIDER@example.com', password), /UNIQUE/);
    await logoutUser(database);
    assert.equal(await getCurrentUser(database), null);
    await database.runAsync('UPDATE users SET password_hash = ? WHERE id = ?', password, row.id);
    assert.equal(await loginUser(database, 'rider@example.com', password), null);
  } finally {
    database.close();
  }
});

test('legacy accounts migrate once while preserving passwords, IDs, timestamps, and sessions across reopen', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'rental-auth-'));
  const path = join(directory, 'rental.db');
  let database = openDatabase(path);
  try {
    await database.execAsync(legacySchema);
    // A legacy plaintext value may look like a hash: schema/version, not prefixes, identifies it.
    const legacyPassword = 'pbkdf2-sha256$600000$looks-like-a-hash';
    await database.runAsync('INSERT INTO users (id, full_name, email, password, created_at) VALUES (?, ?, ?, ?, ?)',
      42, 'Legacy Rider', 'legacy@example.com', legacyPassword, '2026-01-01 12:00:00');
    await database.runAsync('INSERT INTO auth_session VALUES (1, 42)');
    await initializeDatabase(database);
    const migrated = await database.getFirstAsync('SELECT * FROM users WHERE id = 42');
    assert.equal('password' in migrated, false);
    assert.equal(migrated.password_version, 1);
    assert.notEqual(migrated.password_hash, legacyPassword);
    assert.equal(migrated.created_at, '2026-01-01 12:00:00');
    assert.equal((await getCurrentUser(database)).id, 42);
    assert.equal((await loginUser(database, 'legacy@example.com', legacyPassword)).id, 42);
    database.close();
    database = openDatabase(path);
    await initializeDatabase(database);
    assert.equal((await database.getFirstAsync('SELECT password_hash FROM users')).password_hash, migrated.password_hash);
    assert.equal((await getCurrentUser(database)).id, 42);
    assert.equal((await loginUser(database, 'legacy@example.com', legacyPassword)).id, 42);
  } finally {
    database.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('failed migration rolls back schema and credentials; retry succeeds', async () => {
  const database = openDatabase();
  const originalRun = database.runAsync;
  try {
    await database.execAsync(legacySchema);
    await database.runAsync('INSERT INTO users VALUES (1, ?, ?, ?, ?)', 'Rider', 'rider@example.com', password, '2026-01-01');
    await database.runAsync('INSERT INTO users VALUES (2, ?, ?, ?, ?)', 'Second Rider', 'second@example.com', 'OtherPassword123', '2026-01-02');
    let updates = 0;
    database.runAsync = async (...args) => {
      if (++updates === 2) throw new Error('Simulated disk write failure');
      return originalRun(...args);
    };
    await assert.rejects(initializeDatabase(database), /disk write failure/);
    database.runAsync = originalRun;
    assert.equal((await database.getFirstAsync('SELECT password FROM users WHERE id = 1')).password, password);
    assert.equal((await database.getFirstAsync('SELECT password FROM users WHERE id = 2')).password, 'OtherPassword123');
    await initializeDatabase(database);
    assert.equal((await loginUser(database, 'rider@example.com', password)).id, 1);
  } finally {
    database.close();
  }
});

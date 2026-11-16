import type { SQLiteDatabase } from 'expo-sqlite';

import { hashPassword, verifyPassword } from '../security/password';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS auth_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  let migrated = false;
  await database.withTransactionAsync(async () => {
    const columns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(users)');
    if (columns.some((column) => column.name === 'password')) {
      await database.execAsync(`
        ALTER TABLE users RENAME COLUMN password TO password_hash;
        ALTER TABLE users ADD COLUMN password_version INTEGER NOT NULL DEFAULT 0;
      `);
    }
    const legacyUsers = await database.getAllAsync<{ id: number; password_hash: string }>(
      'SELECT id, password_hash FROM users WHERE password_version = 0',
    );
    for (const user of legacyUsers) {
      const hash = await hashPassword(user.password_hash);
      await database.runAsync(
        'UPDATE users SET password_hash = ?, password_version = 1 WHERE id = ?', hash, user.id,
      );
    }
    migrated = legacyUsers.length > 0;
  });
  // Remove old WAL frames after replacing legacy credentials.
  if (migrated) await database.execAsync('PRAGMA wal_checkpoint(TRUNCATE)');

}

export async function createUser(
  database: SQLiteDatabase,
  fullName: string,
  email: string,
  password: string,
) {
  const passwordHash = await hashPassword(password);
  await database.runAsync(
    'INSERT INTO users (full_name, email, password_hash, password_version) VALUES (?, ?, ?, 1)',
    fullName.trim(),
    email.trim().toLowerCase(),
    passwordHash,
  );
}

export async function loginUser(
  database: SQLiteDatabase,
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await database.getFirstAsync<AuthUser & { password_hash: string; password_version: number }>(
    'SELECT id, full_name AS fullName, email, password_hash, password_version FROM users WHERE email = ?',
    email.trim().toLowerCase(),
  );

  if (!user || user.password_version !== 1 || !(await verifyPassword(password, user.password_hash))) {
    return null;
  }

  await database.runAsync(
    'INSERT OR REPLACE INTO auth_session (id, user_id) VALUES (1, ?)',
    user.id,
  );

  return { id: user.id, fullName: user.fullName, email: user.email };
}

export async function getCurrentUser(database: SQLiteDatabase): Promise<AuthUser | null> {
  return database.getFirstAsync<AuthUser>(
    `SELECT users.id, users.full_name AS fullName, users.email
     FROM users
     INNER JOIN auth_session ON auth_session.user_id = users.id
     WHERE auth_session.id = 1`,
  );
}

export async function logoutUser(database: SQLiteDatabase) {
  await database.runAsync('DELETE FROM auth_session WHERE id = 1');
}
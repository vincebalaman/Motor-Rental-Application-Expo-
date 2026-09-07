import type { SQLiteDatabase } from 'expo-sqlite';

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
};

export async function initializeDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS auth_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

export async function createUser(
  database: SQLiteDatabase,
  fullName: string,
  email: string,
  password: string,
) {
  await database.runAsync(
    'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)',
    fullName.trim(),
    email.trim().toLowerCase(),
    password,
  );
}

export async function loginUser(
  database: SQLiteDatabase,
  email: string,
  password: string,
): Promise<AuthUser | null> {
  const user = await database.getFirstAsync<AuthUser & { password: string }>(
    'SELECT id, full_name AS fullName, email, password FROM users WHERE email = ? AND password = ?',
    email.trim().toLowerCase(),
    password,
  );

  if (!user) {
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
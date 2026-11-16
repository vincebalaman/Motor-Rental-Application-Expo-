import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeDatabase as initializeAuthDatabase } from './auth';
import { initializeMotorDatabase } from './motors';

export async function initializeDatabase(database: SQLiteDatabase) {
  await initializeAuthDatabase(database);
  await initializeMotorDatabase(database);
}

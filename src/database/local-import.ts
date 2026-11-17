import type { SQLiteDatabase } from 'expo-sqlite';

export type LocalMotor = { id: number; name: string; type: string; price: number; description: string; imageUrl: string };

export async function readLocalImport(database: SQLiteDatabase): Promise<{ sourceId: string | null; motors: LocalMotor[] }> {
  const table = await database.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'motors'");
  // Never run the old initializer: opening the import tool must not seed a new catalog.
  if (!table) return { sourceId: null, motors: [] };
  const motors = await database.getAllAsync<LocalMotor>(
    'SELECT id, name, type, price, description, image_url AS imageUrl FROM motors WHERE deleted_at IS NULL ORDER BY id',
  );
  await database.execAsync('CREATE TABLE IF NOT EXISTS motor_import_metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
  // This is a stable uniqueness identifier, not an authentication credential.
  // Keep it committed before sending any import request so a retry uses the same ID.
  await database.runAsync("INSERT OR IGNORE INTO motor_import_metadata (key, value) VALUES ('source_id', lower(hex(randomblob(16))))");
  const source = await database.getFirstAsync<{ value: string }>("SELECT value FROM motor_import_metadata WHERE key = 'source_id'");
  if (!source || !/^[0-9a-f]{32}$/.test(source.value)) throw new Error('The local import identity could not be read.');
  return { sourceId: source.value, motors };
}

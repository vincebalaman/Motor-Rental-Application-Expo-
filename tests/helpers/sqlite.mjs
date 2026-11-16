import { DatabaseSync } from 'node:sqlite';

// Execute the repository's queries against SQLite without the native Expo runtime.
export function openDatabase(path = ':memory:') {
  const connection = new DatabaseSync(path);
  return {
    close: () => connection.close(),
    execAsync: async (sql) => { connection.exec(sql); },
    getFirstAsync: async (sql, ...params) => connection.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => connection.prepare(sql).all(...params),
    runAsync: async (sql, ...params) => {
      const result = connection.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
    },
    async withTransactionAsync(task) {
      connection.exec('BEGIN');
      try {
        await task();
        connection.exec('COMMIT');
      } catch (error) {
        connection.exec('ROLLBACK');
        throw error;
      }
    },
  };
}


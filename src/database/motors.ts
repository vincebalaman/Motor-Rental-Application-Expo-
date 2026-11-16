import type { SQLiteDatabase } from 'expo-sqlite';

export type Motor = {
    id: number;
    name: string;
    type: string;
    price: number;
    description: string;
    imageUrl: string;
};

const seedMotors: Motor[] = [
    {
        id: 1, 
        name: 'Honda CBR600RR', 
        type: 'Sport', 
        description: 'A high-revving, agile supersport motorcycle built for track precision and road performance.', 
        price: 12000, 
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 2, 
        name: 'Yamaha MT-07', 
        type: 'Naked', 
        description: 'A versatile and torque-rich hyper-naked bike with aggressive styling and comfortable ergonomics.', 
        price: 8200, 
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 3, 
        name: 'BMW R 1250 GS', 
        type: 'Adventure', 
        description: 'The ultimate adventure touring bike engineered to tackle both long highways and rugged off-road paths.', 
        price: 18000, 
        imageUrl: 'https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 4, 
        name: 'Harley-Davidson Iron 883', 
        type: 'Cruiser', 
        description: 'An iconic, blacked-out cruiser delivering raw V-Twin power and classic American style.', 
        price: 11200, 
        imageUrl: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=1000&auto=format&fit=crop&q=80'
    },
    {
        id: 5, 
        name: 'Zero SR/F', 
        type: 'Electric', 
        description: 'A premium, high-torque electric motorcycle offering effortless acceleration and customizable performance profiles.', 
        price: 20000, 
        imageUrl: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=1000&auto=format&fit=crop&q=80'
    },
];

export type MotorInput = Omit<Motor, 'id'>;

export async function initializeMotorDatabase(database: SQLiteDatabase) {
  await database.withTransactionAsync(async () => {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS motors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        price REAL NOT NULL CHECK (price > 0),
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS app_migrations (
        name TEXT PRIMARY KEY NOT NULL
      );
    `);
    const seeded = await database.getFirstAsync<{ name: string }>(
      'SELECT name FROM app_migrations WHERE name = ?', 'motor_inventory_v1',
    );
    if (seeded) return;

    for (const motor of seedMotors) {
      await database.runAsync(
        'INSERT INTO motors (id, name, type, price, description, image_url) VALUES (?, ?, ?, ?, ?, ?)',
        motor.id, motor.name, motor.type, motor.price, motor.description, motor.imageUrl,
      );
    }
    await database.runAsync('INSERT INTO app_migrations (name) VALUES (?)', 'motor_inventory_v1');
  });
}

export async function getMotors(database: SQLiteDatabase): Promise<Motor[]> {
  return database.getAllAsync<Motor>(
    'SELECT id, name, type, price, description, image_url AS imageUrl FROM motors WHERE deleted_at IS NULL ORDER BY id',
  );
}

function normalizeMotor(motor: MotorInput): MotorInput {
  const normalized = {
    name: motor.name.trim(),
    type: motor.type.trim(),
    price: motor.price,
    description: motor.description.trim(),
    imageUrl: motor.imageUrl.trim(),
  };
  if (!normalized.name || !normalized.type || !normalized.description || !normalized.imageUrl ||
      !Number.isFinite(normalized.price) || normalized.price <= 0) {
    throw new Error('Complete all motor details with a valid price.');
  }
  return normalized;
}

export async function insertMotor(database: SQLiteDatabase, input: MotorInput): Promise<Motor> {
  const motor = normalizeMotor(input);
  const result = await database.runAsync(
    'INSERT INTO motors (name, type, price, description, image_url) VALUES (?, ?, ?, ?, ?)',
    motor.name, motor.type, motor.price, motor.description, motor.imageUrl,
  );
  return { ...motor, id: result.lastInsertRowId };
}

export async function saveMotor(database: SQLiteDatabase, id: number, input: MotorInput): Promise<Motor> {
  const motor = normalizeMotor(input);
  const result = await database.runAsync(
    'UPDATE motors SET name = ?, type = ?, price = ?, description = ?, image_url = ? WHERE id = ? AND deleted_at IS NULL',
    motor.name, motor.type, motor.price, motor.description, motor.imageUrl, id,
  );
  if (result.changes !== 1) throw new Error('Motor not found.');
  return { ...motor, id };
}

export async function removeMotor(database: SQLiteDatabase, id: number): Promise<void> {
  // Retain the record so future booking history can reference this motor.
  const result = await database.runAsync(
    'UPDATE motors SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', id,
  );
  if (result.changes !== 1) throw new Error('Motor not found.');
}

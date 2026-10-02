export const MOTOR_TYPES = ['All', 'Scooter', 'Underbone', 'Sport'] as const;
export type MotorType = (typeof MOTOR_TYPES)[number];

export type Motor = {
  id: string;
  name: string;
  type: Exclude<MotorType, 'All'>;
  transmission: 'Automatic' | 'Manual';
  pricePerDay: number;
  available: boolean;
};

const MOCK_MOTORS: Motor[] = [
  { id: '1', name: 'Honda Click 125', type: 'Scooter', transmission: 'Automatic', pricePerDay: 500, available: true },
  { id: '2', name: 'Yamaha NMAX 155', type: 'Scooter', transmission: 'Automatic', pricePerDay: 900, available: true },
  { id: '3', name: 'Honda Beat 110', type: 'Scooter', transmission: 'Automatic', pricePerDay: 400, available: false },
  { id: '4', name: 'Suzuki Raider R150', type: 'Underbone', transmission: 'Manual', pricePerDay: 700, available: true },
  { id: '5', name: 'Yamaha Sniper 155', type: 'Underbone', transmission: 'Manual', pricePerDay: 750, available: true },
  { id: '6', name: 'Honda CB150R', type: 'Sport', transmission: 'Manual', pricePerDay: 1000, available: false },
];

// Swap the body of this function for a SQLite query later, e.g.:
// export async function getMotors(db: SQLiteDatabase) {
//   return db.getAllAsync<Motor>('SELECT * FROM motors');
// }
export async function getMotors(): Promise<Motor[]> {
  return MOCK_MOTORS;
}
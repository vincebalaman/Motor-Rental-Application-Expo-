import type { SupabaseClient } from '@supabase/supabase-js';
import type { LocalMotor } from '../database/local-import';
import { InventoryError, motorPayload } from './inventory';

export function localMotorPayload(motor: LocalMotor) {
  if (!Number.isSafeInteger(motor.id) || motor.id <= 0) throw new InventoryError('This motor has an invalid local ID.');
  if (!motor.imageUrl.trim().startsWith('https://')) throw new InventoryError('This motor needs an HTTPS image URL before it can be imported.');
  return motorPayload({ name: motor.name, type: motor.type, description: motor.description, price: motor.price, imagePath: motor.imageUrl });
}

export function importErrorMessage(error: unknown): string {
  if (error instanceof InventoryError) return error.message;
  if (error instanceof Error && error.message.includes("Cannot find native module 'ExpoSQLite'")) {
    return 'This Android app build does not include expo-sqlite. Rebuild and reinstall the app from the current project configuration, then reload this screen.';
  }
  const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
  if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(String(code))) {
    return 'Apply the local-motor-import SQL migration in Supabase first, then reload this preview.';
  }
  if (code === '42501') return 'Your account needs the Admin role to import motors. Log in again after the role is assigned.';
  return 'Import could not be confirmed. Reload or retry; a previously completed import will not be duplicated.';
}

export function createLocalImportService(client: SupabaseClient) {
  return {
    async mappings(sourceId: string): Promise<Map<number, string>> {
      const { data, error } = await client.from('motor_imports').select('local_motor_id,motor_id').eq('source_id', sourceId);
      if (error) throw error;
      return new Map((data ?? []).map(row => [Number(row.local_motor_id), row.motor_id]));
    },
    async importMotor(sourceId: string, motor: LocalMotor): Promise<string> {
      if (!/^[0-9a-f]{32}$/.test(sourceId)) throw new InventoryError('The local import identity is invalid.');
      const payload = localMotorPayload(motor);
      const { data, error } = await client.rpc('import_local_motor', {
        p_source_id: sourceId, p_local_motor_id: motor.id, p_name: payload.name,
        p_type: payload.type, p_description: payload.description,
        p_daily_rate_centavos: payload.daily_rate_centavos, p_image_url: payload.image_path,
      });
      if (error) throw error;
      if (typeof data !== 'string' || !data) throw new Error('Missing import result');
      return data;
    },
  };
}

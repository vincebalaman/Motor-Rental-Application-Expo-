import type { SupabaseClient } from '@supabase/supabase-js';

export type Motor = {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string;
  imagePath: string;
  imageUrl: string;
  updatedAt: string;
};
export type MotorInput = Pick<Motor, 'name' | 'type' | 'price' | 'description' | 'imagePath'>;
type MotorRow = {
  id: string; name: string; type: string; daily_rate_centavos: number;
  description: string; image_path: string | null; updated_at: string;
};
const COLUMNS = 'id,name,type,daily_rate_centavos,description,image_path,updated_at';

export class InventoryError extends Error {}
export function inventoryErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && error.message === 'motor_has_active_bookings') return 'This motor has an approved or active rental. Resolve its bookings before archiving it or placing it under maintenance.';
  return error instanceof InventoryError ? error.message : 'We could not confirm the change. Refresh the catalog before trying again.';
}

export function motorPayload(input: MotorInput) {
  const price = Math.round(input.price * 100);
  if (!Number.isFinite(input.price) || !Number.isSafeInteger(price) || price < 1 || price > 100000000 || Math.abs(input.price * 100 - price) > 0.000001) {
    throw new InventoryError('Enter a price from ₱0.01 to ₱1,000,000 with at most two decimal places.');
  }
  const name = input.name.trim();
  const type = input.type.trim();
  const description = input.description.trim();
  const imagePath = input.imagePath.trim();
  if (!name || name.length > 120 || !type || type.length > 60 || !description || description.length > 5000) {
    throw new InventoryError('Enter a name (up to 120 characters), type (up to 60), and description (up to 5,000).');
  }
  if (imagePath.startsWith('https://')) {
    try { if (!new URL(imagePath).hostname) throw new Error(); }
    catch { throw new InventoryError('Enter a valid HTTPS image URL.'); }
  } else if (!imagePath || /[:?#\\]/.test(imagePath) || imagePath.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new InventoryError('Enter an HTTPS image URL or a relative path from the motor-images bucket.');
  }
  return { name, type, description, daily_rate_centavos: price, image_path: imagePath };
}

export function createInventoryService(client: SupabaseClient) {
  async function hydrate(rows: MotorRow[]): Promise<Motor[]> {
    const paths = [...new Set(rows.map(row => row.image_path).filter((path): path is string => !!path && !path.startsWith('https://')))];
    const urls = new Map<string, string>();
    if (paths.length) {
      // Image failures must not turn a committed save into an apparent failed save.
      try {
        const { data, error } = await client.storage.from('motor-images').createSignedUrls(paths, 3600);
        if (!error) data?.forEach(image => { if (image.path && image.signedUrl && !image.error) urls.set(image.path, image.signedUrl); });
      } catch { /* Catalog text remains available with image placeholders. */ }
    }
    return rows.map(row => ({
      id: row.id, name: row.name, type: row.type, price: row.daily_rate_centavos / 100,
      description: row.description, imagePath: row.image_path ?? '', updatedAt: row.updated_at,
      imageUrl: row.image_path?.startsWith('https://') ? row.image_path : urls.get(row.image_path ?? '') ?? '',
    }));
  }
  return {
    async list(): Promise<Motor[]> {
      const { data, error } = await client.from('motors').select(COLUMNS).is('archived_at', null).order('created_at');
      if (error) throw error;
      return hydrate(data ?? []);
    },
    async create(input: MotorInput): Promise<Motor> {
      const { data, error } = await client.from('motors').insert(motorPayload(input)).select(COLUMNS).single();
      if (error) throw error;
      if (!data) throw new InventoryError('The motor could not be saved. Refresh the catalog before retrying.');
      return (await hydrate([data]))[0];
    },
    async update(id: string, input: MotorInput, updatedAt: string): Promise<Motor> {
      const { data, error } = await client.from('motors').update(motorPayload(input)).eq('id', id).eq('updated_at', updatedAt).is('archived_at', null).select(COLUMNS).maybeSingle();
      if (error) throw error;
      if (!data) throw new InventoryError('This motor changed or is no longer available. Return to Explore and refresh before editing again.');
      return (await hydrate([data]))[0];
    },
    async archive(id: string, updatedAt: string): Promise<void> {
      const { data, error } = await client.from('motors').update({ archived_at: new Date().toISOString() }).eq('id', id).eq('updated_at', updatedAt).is('archived_at', null).select('id').maybeSingle();
      if (error) throw error;
      if (!data) throw new InventoryError('This motor changed or was already removed. Refresh the catalog before trying again.');
    },
  };
}

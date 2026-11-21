import type { SupabaseClient } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';

export type MotorPhoto = { id: string; uri: string; base64: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function photoBytes(base64: string): ArrayBuffer {
  if (!base64 || base64.length > 6990508 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4) throw new Error('Choose a smaller photo and try again.');
  const bytes = decode(base64);
  const header = new Uint8Array(bytes);
  if (bytes.byteLength > 5242880 || header[0] !== 255 || header[1] !== 216 || header[2] !== 255) throw new Error('Choose a JPEG photo smaller than 5 MB.');
  return bytes;
}
export async function uploadMotorPhoto(client: SupabaseClient, userId: string, photo: MotorPhoto): Promise<string> {
  if (!UUID.test(userId) || !UUID.test(photo.id)) throw new Error('Sign in again before uploading a photo.');
  const bytes = photoBytes(photo.base64);
  // Each selection gets a new ID. Retrying the same selection uploads identical bytes.
  const path = `motors/uploads/${userId}/${photo.id}.jpg`;
  const { error } = await client.storage.from('motor-images').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error('The photo could not be uploaded. Check your connection and try saving again.');
  return path;
}

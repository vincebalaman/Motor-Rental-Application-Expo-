import type { SupabaseClient } from '@supabase/supabase-js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function createProfilePhotoService(client: SupabaseClient) {
  async function signedUrl(path: string) {
    try {
      const { data, error } = await client.storage.from('profile-images').createSignedUrl(path, 3600);
      return error ? '' : data?.signedUrl ?? '';
    } catch { return ''; }
  }
  return {
    async load(userId: string) {
      const { data, error } = await client.from('profile_photos').select('image_path').eq('user_id', userId).maybeSingle();
      if (error) throw new Error('Could not load your profile photo. Please try again.');
      if (!data) return '';
      const url = await signedUrl(data.image_path);
      if (!url) throw new Error('Your photo is saved, but could not be displayed. Please try again.');
      return url;
    },
    async save(userId: string, selectionId: string, bytes: ArrayBuffer) {
      if (!UUID.test(userId) || !UUID.test(selectionId)) throw new Error('Sign in again before saving your photo.');
      const header = new Uint8Array(bytes);
      if (bytes.byteLength > 5242880 || header[0] !== 255 || header[1] !== 216 || header[2] !== 255) throw new Error('Choose a JPEG photo smaller than 5 MB.');
      const { data: identity, error: identityError } = await client.auth.getUser();
      if (identityError || identity.user?.id !== userId) throw new Error('Your session changed. Sign in again before saving your photo.');
      const path = `${userId}/${selectionId}.jpg`;
      const { error: uploadError } = await client.storage.from('profile-images').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw new Error('Your photo could not upload. Check your connection and try again.');
      const { error } = await client.from('profile_photos').upsert({ user_id: userId, image_path: path }, { onConflict: 'user_id' });
      if (error) throw new Error('We could not confirm your photo was saved. Try saving again or reopen Account to check.');
      return signedUrl(path);
    },
  };
}

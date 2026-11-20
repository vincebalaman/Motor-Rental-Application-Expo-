import type { SupabaseClient } from '@supabase/supabase-js';
export type SavedProfile = { id: string; full_name: string; phone: string | null };
export class ProfileError extends Error {}
export function profilePayload(fullName: string, phone: string) {
  const name = fullName.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 120 || /[\u0000-\u001f\u007f]/.test(fullName)) throw new ProfileError('Enter your full name using 2–120 characters.');
  const raw = phone.trim();
  const normalizedPhone = raw.replace(/[\s().-]/g, '');
  if (raw && (!/^[+\d\s().-]+$/.test(raw) || !/^\+?\d{7,15}$/.test(normalizedPhone))) {
    throw new ProfileError('Enter a phone number with 7–15 digits, for example 0917 123 4567 or +63 917 123 4567.');
  }
  return { full_name: name, phone: raw ? normalizedPhone : null };
}
export function profileErrorMessage(error: unknown): string {
  if (error instanceof ProfileError) return error.message;
  return 'We could not confirm your profile update. Your entries are still here; check your connection and try again.';
}
export function createProfileService(client: SupabaseClient) {
  return {
    async update(userId: string, fullName: string, phone: string): Promise<SavedProfile> {
      const payload = profilePayload(fullName, phone);
      const { data: identity, error: identityError } = await client.auth.getUser();
      if (identityError) throw identityError;
      if (!identity.user || identity.user.id !== userId) throw new ProfileError('Your session changed. Log in again before saving your profile.');
      const { data, error } = await client.from('profiles').update(payload).eq('id', userId).select('id,full_name,phone').single();
      if (error) throw error;
      if (!data || data.id !== userId || typeof data.full_name !== 'string' || (data.phone !== null && typeof data.phone !== 'string')) throw new ProfileError('Your profile update could not be confirmed. Try again or reopen Account to check it.');
      return data;
    },
  };
}

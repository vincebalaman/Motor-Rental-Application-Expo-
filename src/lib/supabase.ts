import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let client: SupabaseClient | undefined;

// Deliberately lazy: adding the backend foundation does not change local startup.
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) throw new Error('Configure the Supabase project URL and publishable key in .env.local.');
  if (!key.startsWith('sb_publishable_')) throw new Error('Use a Supabase publishable key, never a secret or service-role key.');
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'https:') throw new Error('Use the HTTPS URL of your Supabase development project.');
  const canPersistSession = Platform.OS !== 'web' || typeof window !== 'undefined';
  client = createClient(url, key, {
    auth: {
      storage: canPersistSession ? AsyncStorage : undefined,
      persistSession: canPersistSession,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState, Image, Text } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { createProfilePhotoService } from '@/services/profile-photos';

export default function ProfileAvatar() {
  const { user } = useAuth();
  return user ? <AccountAvatar key={user.id} userId={user.id} initial={user.fullName.trim().charAt(0).toUpperCase() || '?'} /> : null;
}
function AccountAvatar({ userId, initial }: { userId: string; initial: string }) {
  const [url, setUrl] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    let revision = 0;
    const load = async () => {
      const request = ++revision;
      try {
        const next = await createProfilePhotoService(getSupabaseClient()).load(userId);
        if (active && request === revision) setUrl(next);
      } catch { /* Keep the last photo or initials while offline. */ }
    };
    const initialLoad = setTimeout(() => { void load(); }, 0);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 45 * 60 * 1000);
    return () => { active = false; revision++; clearTimeout(initialLoad); clearInterval(timer); listener.remove(); };
  }, [userId]));
  return url ? <Image source={{ uri: url }} accessibilityLabel="Your profile photo" style={{ width: 46, height: 46, borderRadius: 23 }} onError={() => setUrl('')} /> : <Text style={{ color: '#21484a', fontSize: 18, fontWeight: '600' }}>{initial}</Text>;
}

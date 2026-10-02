import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { getCurrentUser, type AuthUser } from '@/database/auth';

export function useCurrentUser() {
  const database = useSQLiteContext();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    getCurrentUser(database).then((currentUser) => {
      if (!currentUser) {
        router.replace('/auth/login');
        return;
      }
      setUser(currentUser);
    });
  }, [database]);

  return user;
}
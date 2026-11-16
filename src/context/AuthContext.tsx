import { useSQLiteContext } from 'expo-sqlite';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { getCurrentUser, logoutUser, type AuthUser } from '../database/auth';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  sessionError: string | null;
  retrySession: () => void;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const restoredUser = await getCurrentUser(database);
        if (active) setUser(restoredUser);
      } catch {
        if (active) {
          setUser(null);
          setSessionError('We could not restore your session. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();
    return () => {
      active = false;
    };
  }, [database, restoreAttempt]);

  const retrySession = () => {
    setSessionError(null);
    setLoading(true);
    setRestoreAttempt((attempt) => attempt + 1);
  };

  const logout = async () => {
    await logoutUser(database);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, retrySession, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}

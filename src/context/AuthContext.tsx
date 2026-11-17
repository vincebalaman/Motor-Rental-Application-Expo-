import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getSupabaseClient } from '@/lib/supabase';
import { createAuthService, withAuthTimeout, type AuthUser } from '@/services/auth';

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  sessionError: string | null;
  retrySession: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentUserId = useRef<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    let client: SupabaseClient;
    try { client = getSupabaseClient(); } catch {
      // Defer state updates to keep effect setup synchronous and cancellable.
      const timer = setTimeout(() => {
        if (active) { setSessionError('Account connection is not configured. Check the project settings and restart the app.'); setLoading(false); }
      }, 0);
      return () => { active = false; clearTimeout(timer); };
    }
    const service = createAuthService(client);
    const receive = (session: Session | null) => {
      const current = ++revision;
      if (!session) {
        currentUserId.current = null;
        setUser(null); setSessionError(null); setLoading(false);
        return;
      }
      if (currentUserId.current !== session.user.id) setLoading(true);
      // Never await Supabase calls inside onAuthStateChange: its auth lock is held.
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (!active || current !== revision) return;
        void service.loadUser(session).then(restoredUser => {
          if (active && current === revision) { currentUserId.current = restoredUser.id; setUser(restoredUser); setSessionError(null); }
        }).catch(() => {
          if (active && current === revision) {
            setUser(null);
            setSessionError('We could not load your shared account. Check your connection, then try again or return to login.');
          }
        }).finally(() => {
          if (active && current === revision) setLoading(false);
        });
      }, 0);
      timers.add(timer);
    };
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (active) receive(session);
    });
    void withAuthTimeout(client.auth.getSession()).then(({ data, error }) => {
      if (!active || revision !== 0) return;
      if (error) throw error;
      receive(data.session);
    }).catch(() => {
      if (active && revision === 0) { setSessionError('We could not restore your session. Please try again.'); setLoading(false); }
    });
    const refresh = (state: string | null | undefined) => {
      if (state === 'active') void client.auth.startAutoRefresh().catch(() => {});
      else void client.auth.stopAutoRefresh().catch(() => {});
    };
    refresh(AppState.currentState);
    const appState = AppState.addEventListener('change', refresh);
    return () => {
      active = false; revision++;
      timers.forEach(clearTimeout);
      subscription.unsubscribe(); appState.remove(); void client.auth.stopAutoRefresh().catch(() => {});
    };
  }, [attempt]);

  const retrySession = () => { setLoading(true); setSessionError(null); setAttempt(value => value + 1); };
  const signIn = async (email: string, password: string) => {
    try { await createAuthService(getSupabaseClient()).signIn(email, password); }
    catch (error) { setLoading(false); throw error; }
  };
  const logout = async () => {
    const { error } = await withAuthTimeout(getSupabaseClient().auth.signOut({ scope: 'local' }));
    if (error) throw error;
    setUser(null); setSessionError(null); setLoading(false);
  };
  return <AuthContext.Provider value={{ user, loading, sessionError, retrySession, signIn, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

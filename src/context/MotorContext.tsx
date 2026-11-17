import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import { createInventoryService, type Motor, type MotorInput } from '@/services/inventory';

type MotorContextValue = {
  motors: Motor[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refreshError: string | null;
  retry: () => void;
  refresh: () => void;
  createMotor: (motor: MotorInput) => Promise<Motor>;
  updateMotor: (id: string, motor: MotorInput, updatedAt: string) => Promise<void>;
  deleteMotor: (id: string, updatedAt: string) => Promise<void>;
};
const MotorContext = createContext<MotorContextValue | null>(null);

export function MotorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const service = useMemo(() => createInventoryService(getSupabaseClient()), []);
  const [motors, setMotors] = useState<Motor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const revision = useRef(0);
  const loaded = useRef(false);
  const active = useRef(true);

  const load = useCallback(async () => {
    const request = ++revision.current;
    try {
      const inventory = await service.list();
      if (active.current && request === revision.current) {
        loaded.current = true;
        setMotors(inventory); setError(null); setRefreshError(null);
      }
    } catch {
      if (active.current && request === revision.current) {
        if (loaded.current) setRefreshError('Could not refresh. Showing the last loaded catalog; pull down to try again.');
        else setError('We could not load the shared catalog. Check your connection and try again.');
      }
    } finally {
      if (active.current && request === revision.current) { setLoading(false); setRefreshing(false); }
    }
  }, [service]);

  const invalidate = useCallback(() => { revision.current++; }, []);
  useEffect(() => {
    active.current = true;
    const initial = setTimeout(() => { void load(); }, 0);
    const appState = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 45 * 60 * 1000);
    return () => { active.current = false; invalidate(); clearTimeout(initial); appState.remove(); clearInterval(timer); };
  }, [load, invalidate]);

  const requireAdmin = () => {
    if (user?.role !== 'admin') throw new Error('Only an administrator can manage motors.');
  };
  const afterWrite = () => {
    // An older list response must not overwrite a newly committed mutation.
    revision.current++; setRefreshing(false); setRefreshError(null);
  };
  const createMotor = async (input: MotorInput) => {
    requireAdmin();
    const motor = await service.create(input);
    if (active.current) { afterWrite(); setMotors(current => [...current.filter(item => item.id !== motor.id), motor]); }
    return motor;
  };
  const updateMotor = async (id: string, input: MotorInput, updatedAt: string) => {
    requireAdmin();
    const motor = await service.update(id, input, updatedAt);
    if (active.current) { afterWrite(); setMotors(current => current.map(item => item.id === id ? motor : item)); }
  };
  const deleteMotor = async (id: string, updatedAt: string) => {
    requireAdmin();
    await service.archive(id, updatedAt);
    if (active.current) { afterWrite(); setMotors(current => current.filter(item => item.id !== id)); }
  };
  const retry = () => { setLoading(true); setError(null); void load(); };
  const refresh = useCallback(() => { setRefreshing(true); void load(); }, [load]);
  return (
    <MotorContext.Provider value={{ motors, loading, error, refreshing, refreshError, retry, refresh, createMotor, updateMotor, deleteMotor }}>
      {children}
    </MotorContext.Provider>
  );
}

export function useMotorInventory() {
  const context = useContext(MotorContext);
  if (!context) throw new Error('useMotorInventory must be used inside MotorProvider');
  return context;
}

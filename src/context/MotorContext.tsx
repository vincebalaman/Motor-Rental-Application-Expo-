import { useSQLiteContext } from 'expo-sqlite';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { getMotors, insertMotor, removeMotor, saveMotor, type Motor, type MotorInput } from '@/database/motors';

type MotorContextValue = {
  motors: Motor[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  createMotor: (motor: MotorInput) => Promise<Motor>;
  updateMotor: (id: number, motor: MotorInput) => Promise<void>;
  deleteMotor: (id: number) => Promise<void>;
};

const MotorContext = createContext<MotorContextValue | null>(null);

export function MotorProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext();
  const [motors, setMotors] = useState<Motor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const inventory = await getMotors(database);
        if (active) setMotors(inventory);
      } catch {
        if (active) setError('We could not load the motors. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [database, attempt]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((value) => value + 1);
  };

  const createMotor = async (input: MotorInput) => {
    const motor = await insertMotor(database, input);
    setMotors((current) => [...current, motor]);
    return motor;
  };

  const updateMotor = async (id: number, input: MotorInput) => {
    const motor = await saveMotor(database, id, input);
    setMotors((current) => current.map((item) => item.id === id ? motor : item));
  };

  const deleteMotor = async (id: number) => {
    await removeMotor(database, id);
    setMotors((current) => current.filter((motor) => motor.id !== id));
  };

  return (
    <MotorContext.Provider value={{ motors, loading, error, retry, createMotor, updateMotor, deleteMotor }}>
      {children}
    </MotorContext.Provider>
  );
}

export function useMotorInventory() {
  const context = useContext(MotorContext);
  if (!context) throw new Error('useMotorInventory must be used inside MotorProvider');
  return context;
}

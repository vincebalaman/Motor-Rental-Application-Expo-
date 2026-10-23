import { createContext, ReactNode, useContext, useState } from 'react';

import { motors as initialMotors, type Motor } from '@/database/motors';

type MotorInput = Omit<Motor, 'id'>;

type MotorContextValue = {
  motors: Motor[];
  hiddenMotorIds: Set<number>;
  createMotor: (motor: MotorInput) => Motor;
  updateMotor: (id: number, motor: MotorInput) => void;
  hideMotor: (id: number) => void;
};

const MotorContext = createContext<MotorContextValue | null>(null);

export function MotorProvider({ children }: { children: ReactNode }) {
  const [motors, setMotors] = useState<Motor[]>(initialMotors);
  const [hiddenMotorIds, setHiddenMotorIds] = useState<Set<number>>(() => new Set());

  const createMotor = (motor: MotorInput) => {
    const nextId = motors.reduce((highestId, item) => Math.max(highestId, item.id), 0) + 1;
    const createdMotor = { ...motor, id: nextId };
    setMotors((currentMotors) => [...currentMotors, createdMotor]);
    return createdMotor;
  };

  const updateMotor = (id: number, motor: MotorInput) => {
    setMotors((currentMotors) =>
      currentMotors.map((currentMotor) =>
        currentMotor.id === id ? { ...motor, id } : currentMotor,
      ),
    );
  };

  const hideMotor = (id: number) => {
    setHiddenMotorIds((currentIds) => new Set(currentIds).add(id));
  };

  return (
    <MotorContext.Provider value={{ motors, hiddenMotorIds, createMotor, updateMotor, hideMotor }}>
      {children}
    </MotorContext.Provider>
  );
}

export function useMotorInventory() {
  const context = useContext(MotorContext);
  if (!context) {
    throw new Error('useMotorInventory must be used inside MotorProvider');
  }
  return context;
}

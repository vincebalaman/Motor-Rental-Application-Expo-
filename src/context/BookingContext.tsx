import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import type { Motor } from '@/services/inventory';

type BookingContextValue = {
  selectedMotors: Motor[];
  addMotor: (motor: Motor) => void;
  removeMotor: (motorId: string) => void;
  hasMotor: (motorId: string) => boolean;
};

const BookingContext = createContext<BookingContextValue | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [selectedMotors, setSelectedMotors] = useState<Motor[]>([]);

  const addMotor = useCallback((motor: Motor) => {
    setSelectedMotors(current => current.some(item => item.id === motor.id) ? current : [...current, motor]);
  }, []);
  const removeMotor = useCallback((motorId: string) => {
    setSelectedMotors(current => current.filter(motor => motor.id !== motorId));
  }, []);
  const hasMotor = useCallback((motorId: string) => selectedMotors.some(motor => motor.id === motorId), [selectedMotors]);

  const value = useMemo(() => ({ selectedMotors, addMotor, removeMotor, hasMotor }), [selectedMotors, addMotor, removeMotor, hasMotor]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBookingCart() {
  const context = useContext(BookingContext);
  if (!context) throw new Error('useBookingCart must be used inside BookingProvider');
  return context;
}

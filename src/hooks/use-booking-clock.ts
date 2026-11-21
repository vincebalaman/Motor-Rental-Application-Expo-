import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
/** Refresh visible schedule eligibility and fee estimates while a screen remains open. */
export function useBookingClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(useCallback(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 15000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setNow(Date.now()); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  return now;
}

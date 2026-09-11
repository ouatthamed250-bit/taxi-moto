import { useContext } from 'react';
import { AppContext } from './context';
import type { AppContextValue } from './context';

/** Accès à l'état global Taxi-Moto. */
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp doit être utilisé à l’intérieur de <AppProvider>.');
  }
  return context;
}

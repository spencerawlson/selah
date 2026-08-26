/**
 * Reading preferences.
 *
 * Immersion vs. Study — the core toggle. Immersion hides verse numbers and lets
 * the text flow like a book; Study brings the numbers back and makes each verse
 * tappable for explanation. Remembered across launches.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import * as storage from '@/state/storage';

export type ReaderMode = 'study' | 'immersion';

const MODE_KEY = 'selah.reader_mode';

interface ReaderContextValue {
  mode: ReaderMode;
  toggleMode: () => void;
  setMode: (mode: ReaderMode) => void;
}

const ReaderContext = createContext<ReaderContextValue | null>(null);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ReaderMode>('study');

  // Restore the saved preference on launch.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await storage.getItem(MODE_KEY);
      if (active && (stored === 'immersion' || stored === 'study')) setModeState(stored);
    })();
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((next: ReaderMode) => {
    setModeState(next);
    void storage.setItem(MODE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next: ReaderMode = current === 'study' ? 'immersion' : 'study';
      void storage.setItem(MODE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ReaderContextValue>(
    () => ({ mode, toggleMode, setMode }),
    [mode, toggleMode, setMode],
  );

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>;
}

export function useReader(): ReaderContextValue {
  const context = useContext(ReaderContext);
  if (!context) throw new Error('useReader must be used inside <ReaderProvider>.');
  return context;
}

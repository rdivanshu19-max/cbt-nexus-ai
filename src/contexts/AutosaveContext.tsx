import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

interface AutosaveCtx {
  status: AutosaveStatus;
  lastSavedAt: number | null;
  setStatus: (s: AutosaveStatus, savedAt?: number | null) => void;
  reset: () => void;
}

const Ctx = createContext<AutosaveCtx | null>(null);

export const AutosaveProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatusRaw] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lastActiveStatus, setLastActiveStatus] = useState<Exclude<AutosaveStatus, 'offline'>>('idle');

  // Track online/offline globally
  useEffect(() => {
    const onOff = () => setStatusRaw('offline');
    const onOn = () => setStatusRaw(lastActiveStatus);
    window.addEventListener('offline', onOff);
    window.addEventListener('online', onOn);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setStatusRaw('offline');
    return () => {
      window.removeEventListener('offline', onOff);
      window.removeEventListener('online', onOn);
    };
  }, [lastActiveStatus]);

  const setStatus = useCallback((s: AutosaveStatus, savedAt?: number | null) => {
    if (s !== 'offline') setLastActiveStatus(s);
    setStatusRaw(typeof navigator !== 'undefined' && navigator.onLine === false && s !== 'offline' ? 'offline' : s);
    if (s === 'saved') setLastSavedAt(savedAt ?? Date.now());
  }, []);

  const reset = useCallback(() => {
    setStatusRaw('idle');
    setLastActiveStatus('idle');
    setLastSavedAt(null);
  }, []);

  return <Ctx.Provider value={{ status, lastSavedAt, setStatus, reset }}>{children}</Ctx.Provider>;
};

export function useAutosave() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Safe no-op fallback so components can be used outside provider
    return {
      status: 'idle' as AutosaveStatus,
      lastSavedAt: null,
      setStatus: () => {},
      reset: () => {},
    };
  }
  return ctx;
}

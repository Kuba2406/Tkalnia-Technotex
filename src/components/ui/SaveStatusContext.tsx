'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SaveStatusCtx {
  state: SaveState;
  setSaving: () => void;
  setSaved: () => void;
  setError: () => void;
}

const Ctx = createContext<SaveStatusCtx>({
  state: 'idle',
  setSaving: () => {},
  setSaved: () => {},
  setError: () => {},
});

export function SaveStatusProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SaveState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const setSaving = useCallback(() => {
    clearTimer();
    setState('saving');
  }, []);

  const setSaved = useCallback(() => {
    clearTimer();
    setState('saved');
    timerRef.current = setTimeout(() => setState('idle'), 2500);
  }, []);

  const setError = useCallback(() => {
    clearTimer();
    setState('error');
    timerRef.current = setTimeout(() => setState('idle'), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ state, setSaving, setSaved, setError }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSaveStatus() {
  return useContext(Ctx);
}

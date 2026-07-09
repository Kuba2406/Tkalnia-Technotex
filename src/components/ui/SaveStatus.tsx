'use client';

import { useState, useEffect } from 'react';

type State = 'idle' | 'saving' | 'saved' | 'error';

// Global save status event system
const listeners = new Set<(s: State) => void>();

export function notifySave(s: State) {
  listeners.forEach(fn => fn(s));
}

export default function SaveStatus() {
  const [state, setState] = useState<State>('idle');
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (s: State) => {
      setState(s);
      if (timer) clearTimeout(timer);
      if (s === 'saved') {
        setTimer(setTimeout(() => setState('idle'), 2500));
      } else if (s === 'error') {
        setTimer(setTimeout(() => setState('idle'), 4000));
      }
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [timer]);

  if (state === 'idle') return null;

  const labels: Record<State, string> = {
    idle: '',
    saving: '💾 Zapisywanie…',
    saved: '✓ Zapisano',
    error: '✕ Błąd zapisu',
  };

  return (
    <div className={`save-status ${state}`}>
      {labels[state]}
    </div>
  );
}

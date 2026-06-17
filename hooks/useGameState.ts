'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/lib/types';
import { initialState, roundDepth } from '@/lib/data';

const KEY = 'gw-wc26';

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setState(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  const persist = useCallback((next: GameState) => {
    setState(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  }, []);

  const eliminate = useCallback((id: number, roundId: string) => {
    setState(prev => {
      const players = prev.players.map(p => {
        if (p.id !== id || p.out) return p;
        return { ...p, out: true, order: prev.counter + 1, round: roundId, ts: new Date().toISOString() };
      });
      const next = { players, counter: prev.counter + 1 };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const restore = useCallback((id: number) => {
    setState(prev => {
      const players = prev.players.map(p => p.id === id ? { ...p, out: false, order: null, round: null, ts: null } : p);
      const remaining = players.filter(p => p.out).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      remaining.forEach((p, i) => { p.order = i + 1; });
      const next = { players, counter: remaining.length };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = initialState();
    persist(next);
  }, [persist]);

  // Derived
  const dead = state.players.filter(p => p.out);
  const alive = state.players.filter(p => !p.out);

  const deepestEliminated = dead.length
    ? dead.reduce((best, p) => roundDepth(p.round) > roundDepth(best.round) ? p : best)
    : null;

  const crownedId: number | null = (() => {
    if (alive.length === 1) return alive[0].id;
    if (alive.length === 0) return deepestEliminated?.id ?? null;
    return deepestEliminated?.id ?? null;
  })();

  return { state, hydrated, eliminate, restore, reset, dead, alive, deepestEliminated, crownedId };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@/lib/types';
import { initialState, roundDepth, PLAYERS_BASE } from '@/lib/data';

const KEY = 'gw-wc26';
const SYNC_INTERVAL = 3 * 60 * 1000; // re-fetch every 3 min

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const eliminate = useCallback((id: number, roundId: string, ts?: string) => {
    setState(prev => {
      const players = prev.players.map(p => {
        if (p.id !== id || p.out) return p;
        return { ...p, out: true, order: prev.counter + 1, round: roundId, ts: ts ?? new Date().toISOString() };
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
    persist(initialState());
  }, [persist]);

  // Auto-sync: fetches /api/sync and eliminates teams whose results are confirmed
  const syncFromAPI = useCallback(async (): Promise<string[]> => {
    setSyncing(true);
    const eliminated: string[] = [];
    try {
      const res = await fetch('/api/sync');
      if (!res.ok) return [];
      const { result, updatedAt } = await res.json() as {
        result: Record<string, { eliminatedAt: string; date: string } | null>;
        updatedAt: string;
      };

      setState(prev => {
        let next = { ...prev, players: [...prev.players] };
        let counter = prev.counter;

        for (const [teamName, info] of Object.entries(result)) {
          if (!info) continue;
          // Find the player for this team
          const base = PLAYERS_BASE.find(p => p.team === teamName);
          if (!base) continue;
          const player = next.players.find(p => p.id === base.id);
          if (!player || player.out) continue; // already eliminated manually

          // Auto-eliminate
          counter += 1;
          next.players = next.players.map(p =>
            p.id === base.id
              ? { ...p, out: true, order: counter, round: info.eliminatedAt, ts: info.date }
              : p
          );
          next.counter = counter;
          eliminated.push(teamName);
        }

        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
        return next;
      });

      setLastSyncAt(updatedAt);
    } catch {}
    setSyncing(false);
    return eliminated;
  }, []);

  // Auto-sync on mount + every SYNC_INTERVAL
  useEffect(() => {
    if (!hydrated) return;
    syncFromAPI();
    syncTimer.current = setInterval(syncFromAPI, SYNC_INTERVAL);
    return () => { if (syncTimer.current) clearInterval(syncTimer.current); };
  }, [hydrated, syncFromAPI]);

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

  return { state, hydrated, eliminate, restore, reset, dead, alive, deepestEliminated, crownedId, syncing, lastSyncAt, syncFromAPI };
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState } from '@/lib/types';
import { initialState, roundDepth, PLAYERS_BASE } from '@/lib/data';

const SYNC_INTERVAL = 3 * 60 * 1000; // re-fetch every 3 min

export function useGameState() {
  const [state, setState] = useState<GameState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { setHydrated(true); }, []);

  // Auto-sync: fetches /api/sync and rebuilds the whole elimination state from
  // scratch on every call. State is fully derived from the live API — nothing
  // is persisted — so corrections (a result that gets revised, a team that
  // shouldn't have been marked out) always propagate.
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

      // Confirmed eliminations, ordered chronologically so #1 = first out.
      const ms = (d: string) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? 0 : t; };
      const confirmed = Object.entries(result)
        .filter((e): e is [string, { eliminatedAt: string; date: string }] => Boolean(e[1]))
        .sort((a, b) => ms(a[1].date) - ms(b[1].date));

      const next = initialState(); // everyone alive
      for (const [teamName, info] of confirmed) {
        const base = PLAYERS_BASE.find(p => p.team === teamName);
        if (!base) continue;
        const idx = next.players.findIndex(p => p.id === base.id);
        if (idx === -1) continue;
        const order = eliminated.length + 1;
        next.players[idx] = { ...next.players[idx], out: true, order, round: info.eliminatedAt, ts: info.date };
        eliminated.push(teamName);
      }
      next.counter = eliminated.length;

      setState(next);
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

  return { state, hydrated, dead, alive, deepestEliminated, crownedId, syncing, lastSyncAt, syncFromAPI };
}

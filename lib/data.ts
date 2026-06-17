import type { Player, Round, GameState } from './types';

type PlayerBase = Omit<Player, 'out' | 'order' | 'round' | 'ts'>;

export const PLAYERS_BASE: PlayerBase[] = [
  { id: 1, name: 'Nut',     team: 'Croatia',   flag: 'hr',     accent: '#CC2020' },
  { id: 2, name: 'Champ',   team: 'Argentina', flag: 'ar',     accent: '#5B9BD5' },
  { id: 3, name: 'Pat',     team: 'Spain',     flag: 'es',     accent: '#C60B1E' },
  { id: 4, name: 'Nun',     team: 'Brazil',    flag: 'br',     accent: '#009B3A' },
  { id: 5, name: 'Fluck',   team: 'England',   flag: 'gb-eng', accent: '#CF091F' },
  { id: 6, name: 'A.J.Nae', team: 'Portugal',  flag: 'pt',     accent: '#006400' },
  { id: 7, name: 'Name',    team: 'France',    flag: 'fr',     accent: '#003189' },
  { id: 8, name: 'Kim',     team: 'Germany',   flag: 'de',     accent: '#2A2A2A' },
];

export const ROUNDS: Round[] = [
  { id: 'group', label: 'รอบแบ่งกลุ่ม', sub: 'Group Stage',       depth: 0 },
  { id: 'r32',   label: 'รอบ 32 ทีม',   sub: 'Round of 32',       depth: 1 },
  { id: 'r16',   label: 'รอบ 16 ทีม',   sub: 'Round of 16',       depth: 2 },
  { id: 'qf',    label: 'รอบ 8 ทีม',    sub: 'Quarter-Finals',    depth: 3 },
  { id: 'sf',    label: 'รอบ 4 ทีม',    sub: 'Semi-Finals',       depth: 4 },
  { id: '3rd',   label: 'อันดับ 3',      sub: '3rd Place',         depth: 5 },
  { id: 'ru',    label: 'รองแชมป์',      sub: 'Runner-Up (Final)', depth: 6 },
  { id: 'champ', label: 'แชมป์โลก',     sub: 'World Champion!',   depth: 7 },
];

export function initialState(): GameState {
  return {
    players: PLAYERS_BASE.map(p => ({ ...p, out: false, order: null, round: null, ts: null })),
    counter: 0,
  };
}

export function roundDepth(id: string | null): number {
  return ROUNDS.find(r => r.id === id)?.depth ?? -1;
}

export function getRound(id: string | null) {
  return ROUNDS.find(r => r.id === id) ?? null;
}

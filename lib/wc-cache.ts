// Shared server-side cache for api-football.com
// Prevents redundant API calls across all routes

const BASE = 'https://v3.football.api-sports.io';
export const LEAGUE = 1;    // FIFA World Cup
export const SEASON = 2026;

const FIXTURES_TTL  = 15 * 60 * 1000; // 15 min
const STANDINGS_TTL = 20 * 60 * 1000; // 20 min
const LIVE_TTL      = 60  * 1000;     // 1 min when live match

// ── Types ─────────────────────────────────────────────────────────────────

export interface ApiFixture {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string; elapsed: number | null };
  };
  league: { id: number; round: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface ApiStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}

// ── Status helpers ──────────────────────────────────────────────────────────

export const LIVE_STATUS  = new Set(['1H','HT','2H','ET','BT','P','LIVE','INT']);
export const DONE_STATUS  = new Set(['FT','AET','PEN','AWD','WO']);

// ── Internal cache ─────────────────────────────────────────────────────────

let fixturesCache:  { data: ApiFixture[];           ts: number } | null = null;
let standingsCache: { data: ApiStandingEntry[][];   ts: number } | null = null;
let liveCache:      { data: ApiFixture[];           ts: number } | null = null;

// ── Fetch helper ───────────────────────────────────────────────────────────

async function apiFetch(path: string) {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('No API key — set API_FOOTBALL_KEY in .env.local');
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'x-apisports-key': key },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`api-football error ${res.status}`);
  return res.json();
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getFixtures(): Promise<ApiFixture[]> {
  if (fixturesCache && Date.now() - fixturesCache.ts < FIXTURES_TTL) return fixturesCache.data;
  const data = await apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  fixturesCache = { data: data.response ?? [], ts: Date.now() };
  return fixturesCache.data;
}

export async function getStandings(): Promise<ApiStandingEntry[][]> {
  if (standingsCache && Date.now() - standingsCache.ts < STANDINGS_TTL) return standingsCache.data;
  const data = await apiFetch(`/standings?league=${LEAGUE}&season=${SEASON}`);
  standingsCache = { data: data.response?.[0]?.league?.standings ?? [], ts: Date.now() };
  return standingsCache.data;
}

export async function getLive(): Promise<ApiFixture[]> {
  if (liveCache && Date.now() - liveCache.ts < LIVE_TTL) return liveCache.data;
  const data = await apiFetch(`/fixtures?live=all&league=${LEAGUE}`);
  liveCache = { data: data.response ?? [], ts: Date.now() };
  return liveCache.data;
}

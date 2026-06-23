// worldcup26.ir — free, no key, purpose-built for WC 2026

const BASE = 'https://worldcup26.ir';
const GAMES_TTL = 3 * 60 * 1000;   // 3 min
const TEAMS_TTL = 60 * 60 * 1000;  // 1 hr (team data is static)

// ── Types ──────────────────────────────────────────────────────────────────

export interface WCGame {
  id: string;
  home_team_name_en: string;
  away_team_name_en: string;
  home_score: string;
  away_score: string;
  finished: 'TRUE' | 'FALSE';
  time_elapsed: string; // "notstarted" | "45" | "90+2" | "HT" etc.
  type: 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';
  group: string;        // "A"–"L" for group stage
  matchday: string;
  local_date: string;   // "06/11/2026 13:00"
  home_team_label?: string;
  away_team_label?: string;
  home_flag?: string;
  away_flag?: string;
  bkk_date?: string;
  bkk_time?: string;
  utc_ms?: number;
  stadium_id?: string;
}

export interface WCTeam {
  id: string;
  name_en: string;
  flag: string;   // flagcdn.com URL
  iso2: string;
  group: string;
}

export interface StandingEntry {
  position: number;
  name: string;
  flag: string;
  mp: number; w: number; d: number; l: number;
  gf: number; ga: number; gd: number; pts: number;
}

// ── In-memory cache ────────────────────────────────────────────────────────

let gamesCache: { data: WCGame[]; ts: number } | null = null;
let teamsCache: { data: Map<string, WCTeam>; ts: number } | null = null;

// ── Fetch helpers ──────────────────────────────────────────────────────────

export async function getGames(): Promise<WCGame[]> {
  if (gamesCache && Date.now() - gamesCache.ts < GAMES_TTL) return gamesCache.data;
  const res = await fetch(`${BASE}/get/games`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`worldcup26.ir/games error ${res.status}`);
  const data = await res.json();
  gamesCache = { data: data.games ?? [], ts: Date.now() };
  return gamesCache.data;
}

export async function getTeams(): Promise<Map<string, WCTeam>> {
  if (teamsCache && Date.now() - teamsCache.ts < TEAMS_TTL) return teamsCache.data;
  const res = await fetch(`${BASE}/get/teams`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`worldcup26.ir/teams error ${res.status}`);
  const data = await res.json();
  const teams: WCTeam[] = data.teams ?? data ?? [];
  const map = new Map<string, WCTeam>();
  for (const t of teams) map.set(t.name_en, t);
  teamsCache = { data: map, ts: Date.now() };
  return teamsCache.data;
}

// ── Compute group standings from game results ──────────────────────────────

export async function getStandings(): Promise<Record<string, StandingEntry[]>> {
  const [games, teams] = await Promise.all([getGames(), getTeams()]);
  const groupGames = games.filter(g => g.type === 'group' && g.finished === 'TRUE');

  const stats: Record<string, Record<string, { mp:number;w:number;d:number;l:number;gf:number;ga:number;pts:number }>> = {};

  for (const m of groupGames) {
    const grp = m.group;
    if (!stats[grp]) stats[grp] = {};
    const hs = parseInt(m.home_score), as = parseInt(m.away_score);
    const add = (name: string, gf: number, ga: number, res: 'w'|'d'|'l') => {
      if (!stats[grp][name]) stats[grp][name] = { mp:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
      const s = stats[grp][name];
      s.mp++; s.gf += gf; s.ga += ga;
      if (res === 'w') { s.w++; s.pts += 3; }
      else if (res === 'd') { s.d++; s.pts++; }
      else s.l++;
    };
    if (hs > as) { add(m.home_team_name_en, hs, as, 'w'); add(m.away_team_name_en, as, hs, 'l'); }
    else if (hs < as) { add(m.home_team_name_en, hs, as, 'l'); add(m.away_team_name_en, as, hs, 'w'); }
    else { add(m.home_team_name_en, hs, as, 'd'); add(m.away_team_name_en, as, hs, 'd'); }
  }

  const result: Record<string, StandingEntry[]> = {};
  for (const [grp, teamStats] of Object.entries(stats)) {
    const entries: StandingEntry[] = Object.entries(teamStats).map(([name, s]) => ({
      position: 0, name,
      flag: teams.get(name)?.flag ?? `https://flagcdn.com/w40/${teams.get(name)?.iso2 ?? 'un'}.png`,
      mp: s.mp, w: s.w, d: s.d, l: s.l,
      gf: s.gf, ga: s.ga, gd: s.gf - s.ga, pts: s.pts,
    }));
    entries.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.name.localeCompare(b.name));
    entries.forEach((e, i) => { e.position = i + 1; });
    result[grp] = entries;
  }
  return result;
}

import { NextResponse } from 'next/server';

const BASE = 'https://api.football-data.org/v4';
const COMP = 'WC';

// Map API stage → our round id
const STAGE_ROUND: Record<string, string> = {
  LAST_32: 'r32',
  LAST_16: 'r16',
  QUARTER_FINALS: 'qf',
  SEMI_FINALS: 'sf',     // loses sf AND loses 3rd place match
  THIRD_PLACE: '3rd',   // wins 3rd place match
  FINAL: 'champ',       // special: winner = champ, loser = ru
};

// Our teams — ordered from most-specific to least-specific to avoid false matches
const OUR_TEAMS = ['Croatia', 'Argentina', 'Spain', 'Brazil', 'England', 'Portugal', 'France', 'Germany'];

function matchesTeam(apiName: string, ourTeam: string): boolean {
  const a = apiName.toLowerCase();
  const b = ourTeam.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

let cache: { data: unknown; ts: number } | null = null;
const TTL = 2 * 60 * 1000;

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  if (cache && Date.now() - cache.ts < TTL) return NextResponse.json(cache.data);

  // Fetch all matches in one call
  const res = await fetch(`${BASE}/competitions/${COMP}/matches`, {
    headers: { 'X-Auth-Token': key },
  });
  if (!res.ok) return NextResponse.json({ error: `API error ${res.status}` }, { status: res.status });

  const { matches = [] } = await res.json();

  // Result map: team → { eliminatedAt, date }
  const result: Record<string, { eliminatedAt: string; date: string } | null> = {};
  for (const t of OUR_TEAMS) result[t] = null;

  // 1. FINAL — determine champ vs runner-up
  const finalMatch = matches.find((m: Match) => m.stage === 'FINAL' && m.status === 'FINISHED');
  if (finalMatch) {
    const winner = finalMatch.score.winner === 'HOME_TEAM' ? finalMatch.homeTeam.name : finalMatch.awayTeam.name;
    const loser  = finalMatch.score.winner === 'HOME_TEAM' ? finalMatch.awayTeam.name : finalMatch.homeTeam.name;
    for (const t of OUR_TEAMS) {
      if (matchesTeam(winner, t)) result[t] = { eliminatedAt: 'champ', date: finalMatch.utcDate };
      if (matchesTeam(loser,  t)) result[t] = { eliminatedAt: 'ru',    date: finalMatch.utcDate };
    }
  }

  // 2. Knockout stages (most recent first — later stages override earlier ones if somehow duped)
  const knockoutOrder = ['THIRD_PLACE', 'SEMI_FINALS', 'QUARTER_FINALS', 'LAST_16', 'LAST_32'];
  for (const stage of knockoutOrder) {
    const finished = matches.filter((m: Match) => m.stage === stage && m.status === 'FINISHED');
    for (const m of finished) {
      if (!m.score.winner) continue;
      const loser = m.score.winner === 'HOME_TEAM' ? m.awayTeam.name : m.homeTeam.name;
      const winner = m.score.winner === 'HOME_TEAM' ? m.homeTeam.name : m.awayTeam.name;
      for (const t of OUR_TEAMS) {
        if (result[t] !== null) continue; // already determined
        if (stage === 'THIRD_PLACE') {
          if (matchesTeam(winner, t)) result[t] = { eliminatedAt: '3rd', date: m.utcDate };
          if (matchesTeam(loser,  t)) result[t] = { eliminatedAt: 'sf',  date: m.utcDate };
        } else {
          if (matchesTeam(loser, t)) result[t] = { eliminatedAt: STAGE_ROUND[stage], date: m.utcDate };
        }
      }
    }
  }

  // 3. Group stage — teams that played 3 group matches but aren't in LAST_32
  const r32Matches = matches.filter((m: Match) => m.stage === 'LAST_32');
  if (r32Matches.length > 0) {
    const teamsInR32 = new Set<string>(
      r32Matches.flatMap((m: Match) => [m.homeTeam.name, m.awayTeam.name].filter(Boolean))
    );
    const groupFinished = matches.filter((m: Match) => m.stage === 'GROUP_STAGE' && m.status === 'FINISHED');

    for (const t of OUR_TEAMS) {
      if (result[t] !== null) continue;
      const inR32 = [...teamsInR32].some(name => matchesTeam(name, t));
      if (inR32) continue;

      // Check they actually played (≥ 3 finished group matches)
      const played = groupFinished.filter((m: Match) =>
        matchesTeam(m.homeTeam.name, t) || matchesTeam(m.awayTeam.name, t)
      );
      if (played.length >= 3) {
        const lastMatch = played.sort((a: Match, b: Match) => b.utcDate.localeCompare(a.utcDate))[0];
        result[t] = { eliminatedAt: 'group', date: lastMatch.utcDate };
      }
    }
  }

  const data = { result, updatedAt: new Date().toISOString() };
  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

interface Match {
  stage: string;
  status: string;
  utcDate: string;
  score: { winner: string | null; fullTime: { home: number | null; away: number | null } };
  homeTeam: { name: string };
  awayTeam: { name: string };
}

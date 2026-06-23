import { NextResponse } from 'next/server';
import { getGames } from '@/lib/wc-data';

const OUR_TEAMS = ['Croatia','Argentina','Spain','Brazil','England','Portugal','France','Germany'];

function matchTeam(apiName: string, our: string) {
  const a = apiName.toLowerCase(), b = our.toLowerCase();
  return a === b || a.includes(b) || b.includes(a);
}

// worldcup26.ir type → our round id
const TYPE_ROUND: Record<string, string> = {
  r32: 'r32', r16: 'r16', qf: 'qf', sf: 'sf', third: '3rd', final: 'champ',
};

let cache: { data: unknown; ts: number } | null = null;
const TTL = 2 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) return NextResponse.json(cache.data);

  try {
    const games = await getGames();
    const finished = games.filter(g => g.finished === 'TRUE');

    const result: Record<string, { eliminatedAt: string; date: string } | null> = {};
    for (const t of OUR_TEAMS) result[t] = null;

    // FINAL — winner = champ, loser = ru
    const final = finished.find(g => g.type === 'final' && g.home_team_name_en && g.away_team_name_en);
    if (final) {
      const hs = parseInt(final.home_score), as = parseInt(final.away_score);
      const winner = hs > as ? final.home_team_name_en : final.away_team_name_en;
      const loser  = hs > as ? final.away_team_name_en : final.home_team_name_en;
      for (const t of OUR_TEAMS) {
        if (matchTeam(winner, t)) result[t] = { eliminatedAt: 'champ', date: final.local_date };
        if (matchTeam(loser,  t)) result[t] = { eliminatedAt: 'ru',    date: final.local_date };
      }
    }

    // 3rd place — winner = 3rd, loser = sf
    const third = finished.find(g => g.type === 'third');
    if (third) {
      const hs = parseInt(third.home_score), as = parseInt(third.away_score);
      const winner = hs > as ? third.home_team_name_en : third.away_team_name_en;
      const loser  = hs > as ? third.away_team_name_en : third.home_team_name_en;
      for (const t of OUR_TEAMS) {
        if (result[t]) continue;
        if (matchTeam(winner, t)) result[t] = { eliminatedAt: '3rd', date: third.local_date };
        if (matchTeam(loser,  t)) result[t] = { eliminatedAt: 'sf',  date: third.local_date };
      }
    }

    // Knockout stages
    for (const type of ['sf', 'qf', 'r16', 'r32']) {
      for (const m of finished.filter(g => g.type === type && g.home_team_name_en)) {
        const hs = parseInt(m.home_score), as = parseInt(m.away_score);
        const loser = hs > as ? m.away_team_name_en : m.home_team_name_en;
        for (const t of OUR_TEAMS) {
          if (!result[t] && matchTeam(loser, t)) result[t] = { eliminatedAt: TYPE_ROUND[type], date: m.local_date };
        }
      }
    }

    // Group stage — team played 3 games but not in R32 draw
    const r32games = games.filter(g => g.type === 'r32');
    if (r32games.length > 0) {
      const inR32 = new Set(r32games.flatMap(g => [g.home_team_name_en, g.away_team_name_en].filter(Boolean)));
      const groupDone = finished.filter(g => g.type === 'group');
      for (const t of OUR_TEAMS) {
        if (result[t]) continue;
        if ([...inR32].some(n => matchTeam(n, t))) continue;
        const played = groupDone.filter(g => matchTeam(g.home_team_name_en, t) || matchTeam(g.away_team_name_en, t));
        if (played.length >= 3) result[t] = { eliminatedAt: 'group', date: played[played.length - 1].local_date };
      }
    }

    const data = { result, updatedAt: new Date().toISOString() };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getGames } from '@/lib/wc-data';
import type { WCGame } from '@/lib/wc-data';

const OUR_TEAMS = ['Croatia','Argentina','Spain','Brazil','England','Portugal','France','Germany'];

const norm = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

function matchTeam(apiName: string | null | undefined, our: string) {
  return norm(apiName) === norm(our);
}

// worldcup26.ir type → our round id
const TYPE_ROUND: Record<string, string> = {
  r32: 'r32', r16: 'r16', qf: 'qf', sf: 'sf', third: '3rd', final: 'champ',
};

// Which round each knockout winner advances into (used to infer the loser of a
// penalty shootout, since the API exposes no penalty score).
const SUCCESSOR: Record<string, string> = { r32: 'r16', r16: 'qf', qf: 'sf', sf: 'final' };

let cache: { data: unknown; ts: number } | null = null;
const TTL = 2 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < TTL) return NextResponse.json(cache.data);

  try {
    const games = await getGames();
    const finished = games.filter(g => g.finished === 'TRUE');

    // Set of (normalised) team names that appear in a given round's fixtures.
    // Used to detect who advanced — works even before a match is finished, as
    // long as the draw populated the next-round fixture names.
    const namedIn = (type: string) => new Set(
      games
        .filter(g => g.type === type)
        .flatMap(g => [g.home_team_name_en, g.away_team_name_en])
        .map(norm)
        .filter(Boolean),
    );

    // Determine the loser of a finished knockout match.
    // Returns null when it cannot be determined reliably (missing teams/scores,
    // or a draw whose shootout result isn't yet inferable from the next round).
    const loserOf = (m: WCGame): string | null => {
      const H = m.home_team_name_en, A = m.away_team_name_en;
      if (!H || !A) return null;
      const hs = parseInt(m.home_score), as = parseInt(m.away_score);
      if (Number.isNaN(hs) || Number.isNaN(as)) return null;
      if (hs > as) return A;
      if (as > hs) return H;
      // Draw → decided on penalties. The API has no penalty field, so infer the
      // loser from progression: the winner appears in the next round, the loser
      // does not.
      const succ = SUCCESSOR[m.type];
      if (!succ) return null; // final / third place: no successor to infer from
      const adv = namedIn(succ);
      const hAdv = adv.has(norm(H)), aAdv = adv.has(norm(A));
      if (hAdv && !aAdv) return A;
      if (aAdv && !hAdv) return H;
      return null; // next round not drawn yet — can't tell, leave for manual
    };

    const result: Record<string, { eliminatedAt: string; date: string } | null> = {};
    for (const t of OUR_TEAMS) result[t] = null;

    // FINAL — winner = champ, loser = ru. Skip if drawn (penalty result unknown).
    const final = finished.find(g => g.type === 'final' && g.home_team_name_en && g.away_team_name_en);
    if (final) {
      const hs = parseInt(final.home_score), as = parseInt(final.away_score);
      if (!Number.isNaN(hs) && !Number.isNaN(as) && hs !== as) {
        const winner = hs > as ? final.home_team_name_en : final.away_team_name_en;
        const loser  = hs > as ? final.away_team_name_en : final.home_team_name_en;
        for (const t of OUR_TEAMS) {
          if (matchTeam(winner, t)) result[t] = { eliminatedAt: 'champ', date: final.local_date };
          if (matchTeam(loser,  t)) result[t] = { eliminatedAt: 'ru',    date: final.local_date };
        }
      }
    }

    // 3rd place — winner = 3rd, loser = sf. Skip if drawn (penalty result unknown).
    const third = finished.find(g => g.type === 'third' && g.home_team_name_en && g.away_team_name_en);
    if (third) {
      const hs = parseInt(third.home_score), as = parseInt(third.away_score);
      if (!Number.isNaN(hs) && !Number.isNaN(as) && hs !== as) {
        const winner = hs > as ? third.home_team_name_en : third.away_team_name_en;
        const loser  = hs > as ? third.away_team_name_en : third.home_team_name_en;
        for (const t of OUR_TEAMS) {
          if (result[t]) continue;
          if (matchTeam(winner, t)) result[t] = { eliminatedAt: '3rd', date: third.local_date };
          if (matchTeam(loser,  t)) result[t] = { eliminatedAt: 'sf',  date: third.local_date };
        }
      }
    }

    // Knockout stages — eliminate the loser of each finished match.
    for (const type of ['sf', 'qf', 'r16', 'r32']) {
      for (const m of finished.filter(g => g.type === type && g.home_team_name_en && g.away_team_name_en)) {
        const loser = loserOf(m);
        if (!loser) continue;
        for (const t of OUR_TEAMS) {
          if (!result[t] && matchTeam(loser, t)) result[t] = { eliminatedAt: TYPE_ROUND[type], date: m.local_date };
        }
      }
    }

    // Group stage — team played 3 games but didn't make the R32 draw.
    // Only conclude this once the R32 draw is COMPLETE (all 32 teams named),
    // otherwise unpopulated fixtures would falsely eliminate qualified teams.
    const r32games = games.filter(g => g.type === 'r32');
    const inR32 = new Set(r32games.flatMap(g => [g.home_team_name_en, g.away_team_name_en]).map(norm).filter(Boolean));
    if (inR32.size >= 32) {
      const groupDone = finished
        .filter(g => g.type === 'group')
        .slice()
        .sort((a, b) => (a.utc_ms ?? 0) - (b.utc_ms ?? 0));
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

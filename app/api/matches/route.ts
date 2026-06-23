import { NextResponse } from 'next/server';
import { getGames, getTeams } from '@/lib/wc-data';

const STAGE_TYPE: Record<string, string[]> = {
  GROUP_STAGE:    ['group'],
  LAST_32:        ['r32'],
  LAST_16:        ['r16'],
  QUARTER_FINALS: ['qf'],
  SEMI_FINALS:    ['sf'],
  FINAL:          ['final', 'third'],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage') ?? 'GROUP_STAGE';
  const types = STAGE_TYPE[stage] ?? ['group'];

  try {
    const [games, teams] = await Promise.all([getGames(), getTeams()]);
    const matches = games
      .filter(g => types.includes(g.type))
      .map(g => ({
        ...g,
        home_flag: teams.get(g.home_team_name_en)?.flag ?? '',
        away_flag: teams.get(g.away_team_name_en)?.flag ?? '',
      }));
    return NextResponse.json({ matches });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

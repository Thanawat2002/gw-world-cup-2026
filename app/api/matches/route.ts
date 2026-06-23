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

// Stadium ID → UTC offset (summer/daylight saving)
// Eastern: EDT = UTC-4 | Central US: CDT = UTC-5 | Central MX: UTC-6 | Western: PDT = UTC-7
const STADIUM_UTC: Record<string, number> = {
  '1': -6, '2': -6, '3': -6,              // Mexico City, Guadalajara, Monterrey
  '4': -5, '5': -5, '6': -5,              // Dallas, Houston, Kansas City
  '7': -4, '8': -4, '9': -4,              // Atlanta, Miami, Boston
  '10': -4, '11': -4, '12': -4,           // Philadelphia, New York/NJ, Toronto
  '13': -7, '14': -7, '15': -7, '16': -7, // Vancouver, Seattle, San Francisco, Los Angeles
};

function toBKK(local_date: string, stadiumId: string) {
  const off = STADIUM_UTC[stadiumId] ?? -5;
  const [datePart, timePart] = local_date.split(' ');
  const [mm, dd, yyyy] = datePart.split('/');
  const sign = off >= 0 ? '+' : '-';
  const pad = Math.abs(off).toString().padStart(2, '0');
  const dt = new Date(`${yyyy}-${mm}-${dd}T${timePart}:00${sign}${pad}:00`);
  return {
    bkk_date: dt.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' }),
    bkk_time: dt.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok', hour: '2-digit', minute: '2-digit' }),
    utc_ms: dt.getTime(),
  };
}

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
        ...toBKK(g.local_date, String((g as unknown as Record<string, unknown>).stadium_id ?? '')),
      }));
    return NextResponse.json({ matches });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

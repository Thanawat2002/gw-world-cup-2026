import { NextResponse } from 'next/server';

const BASE = 'https://api.football-data.org/v4';
const COMP = 'WC';

const cacheMap = new Map<string, { data: unknown; ts: number }>();
const TTL = 5 * 60 * 1000;

export async function GET(req: Request) {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage') ?? 'GROUP_STAGE';

  const cached = cacheMap.get(stage);
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data);
  }

  const res = await fetch(`${BASE}/competitions/${COMP}/matches?stage=${stage}`, {
    headers: { 'X-Auth-Token': key },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `API error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  cacheMap.set(stage, { data, ts: Date.now() });
  return NextResponse.json(data);
}

import { NextResponse } from 'next/server';

const BASE = 'https://api.football-data.org/v4';
const COMP = 'WC';

let cache: { data: unknown; ts: number } | null = null;
const TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) return NextResponse.json({ error: 'No API key' }, { status: 500 });

  if (cache && Date.now() - cache.ts < TTL) {
    return NextResponse.json(cache.data);
  }

  const res = await fetch(`${BASE}/competitions/${COMP}/standings`, {
    headers: { 'X-Auth-Token': key },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: `API error ${res.status}` }, { status: res.status });
  }

  const data = await res.json();
  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

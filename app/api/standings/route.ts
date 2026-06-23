import { NextResponse } from 'next/server';
import { getStandings } from '@/lib/wc-data';

export async function GET() {
  try {
    const standings = await getStandings();
    return NextResponse.json({ standings });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 500 });
  }
}

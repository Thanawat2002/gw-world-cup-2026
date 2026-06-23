'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { WCGame, StandingEntry } from '@/lib/wc-data';

// ── Constants ─────────────────────────────────────────────────────────────

const STAGES = [
  { id: 'GROUP_STAGE',    label: 'GS',  full: 'Group Stage'    },
  { id: 'LAST_32',        label: 'R32', full: 'Round of 32'    },
  { id: 'LAST_16',        label: 'R16', full: 'Round of 16'    },
  { id: 'QUARTER_FINALS', label: 'QF',  full: 'Quarter-Finals' },
  { id: 'SEMI_FINALS',    label: 'SF',  full: 'Semi-Finals'    },
  { id: 'FINAL',          label: 'F',   full: 'Final'          },
];

const OUR_TEAMS = ['Croatia','Argentina','Spain','Brazil','England','Portugal','France','Germany'];

function isOurs(name: string) {
  if (!name) return false;
  return OUR_TEAMS.some(t => name.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(name.toLowerCase()));
}

// ── Flag image ─────────────────────────────────────────────────────────────

function Flag({ src, name, size = 20 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !src) return <span style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, color: 'var(--text-muted)', flexShrink: 0 }}>{name?.slice(0, 2)}</span>;
  return <Image src={src} alt={name} width={size} height={Math.round(size * 0.67)} unoptimized style={{ objectFit: 'cover', flexShrink: 0, borderRadius: 2 }} onError={() => setErr(true)} />;
}

// ── Group Stage ────────────────────────────────────────────────────────────

function GroupStage({ standings }: { standings: Record<string, StandingEntry[]> }) {
  const groups = Object.entries(standings).sort(([a], [b]) => a.localeCompare(b));
  if (!groups.length) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>ยังไม่มีข้อมูล</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {groups.map(([grp, rows]) => (
        <div key={grp} style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 15, color: 'var(--gold)', letterSpacing: 1 }}>GROUP {grp}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>PTS</span>
          </div>
          {rows.map(row => {
            const ours = isOurs(row.name);
            return (
              <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: ours ? 'rgba(245,158,11,0.06)' : 'transparent' }}>
                <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{row.position}</span>
                <Flag src={row.flag} name={row.name} size={20} />
                <span style={{ flex: 1, fontSize: 13, color: ours ? 'var(--text)' : 'var(--text-muted)', fontWeight: ours ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 18, textAlign: 'center' }}>{row.mp}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: ours ? 'var(--gold)' : 'var(--text)', width: 22, textAlign: 'right' }}>{row.pts}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Match list ─────────────────────────────────────────────────────────────

const BKK = 'Asia/Bangkok';

function parseDate(local_date: string): Date {
  // local_date is UTC: "06/11/2026 13:00"
  const [datePart, timePart] = local_date.split(' ');
  const [mm, dd, yyyy] = datePart.split('/');
  const [hh, min] = timePart.split(':');
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00Z`);
}

function MatchList({ matches }: { matches: WCGame[] }) {
  if (!matches.length) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>ยังไม่มีข้อมูลแมตช์</div>;

  const sorted = [...matches].sort((a, b) => parseDate(a.local_date).getTime() - parseDate(b.local_date).getTime());

  const byDate = new Map<string, WCGame[]>();
  for (const m of sorted) {
    const d = parseDate(m.local_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: BKK });
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(m);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[...byDate.entries()].map(([date, ms]) => (
        <div key={date}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4 }}>{date}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ms.map(m => {
              const homeOurs = isOurs(m.home_team_name_en);
              const awayOurs = isOurs(m.away_team_name_en);
              const ours     = homeOurs || awayOurs;
              const finished = m.finished === 'TRUE';
              const live     = !finished && m.time_elapsed !== 'notstarted' && m.time_elapsed;
              const homeName = m.home_team_name_en || m.home_team_label || '?';
              const awayName = m.away_team_name_en || m.away_team_label || '?';
              const timeStr  = parseDate(m.local_date).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: BKK });

              return (
                <div key={m.id} style={{ background: ours ? 'rgba(245,158,11,0.07)' : 'var(--surface)', border: `1px solid ${ours ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Home */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 13, color: homeOurs ? 'var(--gold)' : 'var(--text-muted)', fontWeight: homeOurs ? 600 : 400, textAlign: 'right', lineHeight: 1.3 }}>{homeName}</span>
                    {m.home_flag && <Flag src={m.home_flag} name={homeName} size={22} />}
                  </div>
                  {/* Score / Time */}
                  <div style={{ minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
                    {finished ? (
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-bebas-neue)', letterSpacing: 2 }}>{m.home_score} — {m.away_score}</span>
                    ) : live ? (
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)', fontFamily: 'var(--font-bebas-neue)', letterSpacing: 1 }}>{m.home_score ?? 0} — {m.away_score ?? 0}</div>
                        <div style={{ fontSize: 10, color: 'var(--red)', animation: 'pulse-red 1.5s ease-in-out infinite' }}>{m.time_elapsed}′</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{timeStr}</span>
                    )}
                  </div>
                  {/* Away */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.away_flag && <Flag src={m.away_flag} name={awayName} size={22} />}
                    <span style={{ fontSize: 13, color: awayOurs ? 'var(--gold)' : 'var(--text-muted)', fontWeight: awayOurs ? 600 : 400, lineHeight: 1.3 }}>{awayName}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function StandingsPanel() {
  const [activeStage, setActiveStage] = useState('GROUP_STAGE');
  const [standings, setStandings]   = useState<Record<string, StandingEntry[]>>({});
  const [matches, setMatches]       = useState<WCGame[]>([]);
  const [hasLive, setHasLive]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async (stage: string) => {
    setLoading(true); setError(null);
    try {
      const mRes = await fetch(`/api/matches?stage=${stage}`).then(r => r.json());
      if (mRes.error) throw new Error(mRes.error);
      const ms: WCGame[] = mRes.matches ?? [];
      setMatches(ms);

      const live = ms.some(m => m.finished !== 'TRUE' && m.time_elapsed && m.time_elapsed !== 'notstarted');
      setHasLive(live);

      if (stage === 'GROUP_STAGE') {
        const sRes = await fetch('/api/standings').then(r => r.json());
        if (sRes.error) throw new Error(sRes.error);
        setStandings(sRes.standings ?? {});
      } else {
        setStandings({});
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(activeStage); }, [activeStage, load]);

  // Poll every 60s when live match
  useEffect(() => {
    if (!hasLive) return;
    const t = setInterval(() => load(activeStage), 60_000);
    return () => clearInterval(t);
  }, [hasLive, activeStage, load]);

  return (
    <div className="panel" style={{ marginTop: 0 }}>
      <style>{`
        @keyframes live-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .live-dot { width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;flex-shrink:0;animation:live-blink 1.2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="panel-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
        </svg>
        <span className="panel-head-title">FIFA World Cup 2026</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: hasLive ? '#22c55e' : 'var(--text-dim)', letterSpacing: 1 }}>
          <span className="live-dot" />
          {hasLive ? 'LIVE NOW' : 'LIVE STANDINGS'}
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 0 16px', overflowX: 'auto' }}>
        {STAGES.map(s => (
          <button key={s.id} onClick={() => setActiveStage(s.id)} title={s.full}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-bebas-neue)', letterSpacing: 1.5, transition: 'all 0.2s', background: activeStage === s.id ? 'var(--gold)' : 'var(--surface)', color: activeStage === s.id ? '#080810' : 'var(--text-muted)', flexShrink: 0 }}>
            {s.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 12, letterSpacing: 2, animation: 'pulse-red 2s ease-in-out infinite' }}>LOADING...</div>}

      {!loading && error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: 'var(--red)', fontSize: 13 }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {activeStage === 'GROUP_STAGE' && Object.keys(standings).length > 0 && <GroupStage standings={standings} />}
          {matches.length > 0 && (
            <div>
              {activeStage === 'GROUP_STAGE' && Object.keys(standings).length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Match Schedule</div>
              )}
              <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                <MatchList matches={matches} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

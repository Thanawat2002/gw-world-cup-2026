'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// --- Types ---
interface TeamStanding {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

interface StandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: TeamStanding[];
}

interface Match {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string };
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}

// --- Constants ---
const STAGES = [
  { id: 'GROUP_STAGE', label: 'GS',  full: 'Group Stage' },
  { id: 'LAST_32',     label: 'R32', full: 'Round of 32' },
  { id: 'LAST_16',     label: 'R16', full: 'Round of 16' },
  { id: 'QUARTER_FINALS', label: 'QF', full: 'Quarter-Finals' },
  { id: 'SEMI_FINALS', label: 'SF',  full: 'Semi-Finals' },
  { id: 'FINAL',       label: 'F',   full: 'Final' },
];

// Teams we care about (highlight them)
const OUR_TEAMS = ['Croatia', 'Argentina', 'Spain', 'Brazil', 'England', 'Portugal', 'France', 'Germany'];

function formatDate(utcDate: string) {
  const d = new Date(utcDate);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }) +
    ' · ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });
}

function CrestImg({ src, name, size = 20 }: { src: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return <span style={{ width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, color: 'var(--text-muted)', background: 'var(--surface)', borderRadius: 3 }}>{name.slice(0, 2)}</span>;
  }
  return (
    <Image src={src} alt={name} width={size} height={size} unoptimized
      style={{ objectFit: 'contain' }}
      onError={() => setErr(true)} />
  );
}

// --- Group Stage View ---
function groupLabel(g: string | null): string {
  if (!g) return '?';
  // API returns "Group C" or "GROUP_C" — normalize to just the letter
  const match = g.match(/[A-L]$/i);
  return match ? match[0].toUpperCase() : g;
}

function GroupStage({ groups }: { groups: StandingGroup[] }) {
  const sorted = [...groups].sort((a, b) => (a.group ?? '').localeCompare(b.group ?? ''));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
      {sorted.map(g => (
        <div key={g.group} style={{ background: 'var(--surface)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {/* Group header */}
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 15, color: 'var(--gold)', letterSpacing: 1 }}>
              GROUP {groupLabel(g.group)}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>PTS</span>
          </div>
          {/* Rows */}
          {g.table.map(row => {
            const isOurs = OUR_TEAMS.some(t => row.team.name.includes(t) || t.includes(row.team.shortName));
            return (
              <div key={row.team.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: isOurs ? 'rgba(245,158,11,0.06)' : 'transparent',
              }}>
                <span style={{ width: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>{row.position}</span>
                <CrestImg src={row.team.crest} name={row.team.tla} size={18} />
                <span style={{ flex: 1, fontSize: 13, color: isOurs ? 'var(--text)' : 'var(--text-muted)', fontWeight: isOurs ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.team.shortName || row.team.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 18, textAlign: 'center' }}>{row.playedGames}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: isOurs ? 'var(--gold)' : 'var(--text)', width: 22, textAlign: 'right' }}>{row.points}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// --- Match List View ---
function MatchList({ matches }: { matches: Match[] }) {
  if (!matches.length) {
    return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>ยังไม่มีข้อมูลแมตช์</div>;
  }

  // Group by date
  const byDate = new Map<string, Match[]>();
  for (const m of matches) {
    const d = new Date(m.utcDate).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'long', day: 'numeric' });
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
              const homeIsOurs = OUR_TEAMS.some(t => m.homeTeam.name?.includes(t));
              const awayIsOurs = OUR_TEAMS.some(t => m.awayTeam.name?.includes(t));
              const isOurs = homeIsOurs || awayIsOurs;
              const finished = m.status === 'FINISHED';
              const live = m.status === 'IN_PLAY' || m.status === 'PAUSED';
              const time = new Date(m.utcDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' });

              return (
                <div key={m.id} style={{
                  background: isOurs ? 'rgba(245,158,11,0.07)' : 'var(--surface)',
                  border: `1px solid ${isOurs ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {/* Home */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 13, color: homeIsOurs ? 'var(--gold)' : 'var(--text-muted)', fontWeight: homeIsOurs ? 600 : 400, textAlign: 'right' }}>
                      {m.homeTeam.shortName || m.homeTeam.name || '?'}
                    </span>
                    {m.homeTeam.crest && <CrestImg src={m.homeTeam.crest} name={m.homeTeam.tla ?? '?'} size={20} />}
                  </div>
                  {/* Score / Time */}
                  <div style={{ minWidth: 64, textAlign: 'center', flexShrink: 0 }}>
                    {finished ? (
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-bebas-neue)', letterSpacing: 2 }}>
                        {m.score.fullTime.home} — {m.score.fullTime.away}
                      </span>
                    ) : live ? (
                      <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, animation: 'pulse-red 1.5s ease-in-out infinite' }}>LIVE</span>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{time}</span>
                    )}
                  </div>
                  {/* Away */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m.awayTeam.crest && <CrestImg src={m.awayTeam.crest} name={m.awayTeam.tla ?? '?'} size={20} />}
                    <span style={{ fontSize: 13, color: awayIsOurs ? 'var(--gold)' : 'var(--text-muted)', fontWeight: awayIsOurs ? 600 : 400 }}>
                      {m.awayTeam.shortName || m.awayTeam.name || '?'}
                    </span>
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

// --- Main Component ---
export default function StandingsPanel() {
  const [activeStage, setActiveStage] = useState('GROUP_STAGE');
  const [standings, setStandings] = useState<StandingGroup[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (activeStage === 'GROUP_STAGE') {
      Promise.all([
        fetch('/api/standings').then(r => r.json()),
        fetch('/api/matches?stage=GROUP_STAGE').then(r => r.json()),
      ]).then(([s, m]) => {
        if (s.error) throw new Error(s.error);
        const groups = (s.standings as StandingGroup[]).filter(g => g.type === 'TOTAL');
        setStandings(groups);
        setMatches((m.matches ?? []) as Match[]);
      }).catch(e => setError(e.message)).finally(() => setLoading(false));
    } else {
      fetch(`/api/matches?stage=${activeStage}`).then(r => r.json()).then(m => {
        if (m.error) throw new Error(m.error);
        setMatches((m.matches ?? []) as Match[]);
        setStandings([]);
      }).catch(e => setError(e.message)).finally(() => setLoading(false));
    }
  }, [activeStage]);

  return (
    <div className="panel" style={{ marginTop: 0 }}>
      <style>{`
        @keyframes live-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .live-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e; display: inline-block;
          flex-shrink: 0;
          animation: live-blink 1.2s ease-in-out infinite;
        }
      `}</style>
      {/* Header */}
      <div className="panel-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <span className="panel-head-title">FIFA World Cup 2026</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-dim)', letterSpacing: 1 }}>
          <span className="live-dot" />
          LIVE STANDINGS
        </span>
      </div>

      {/* Stage tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '0 0 16px', overflowX: 'auto' }}>
        {STAGES.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveStage(s.id)}
            title={s.full}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'var(--font-bebas-neue)', letterSpacing: 1.5, transition: 'all 0.2s',
              background: activeStage === s.id ? 'var(--gold)' : 'var(--surface)',
              color: activeStage === s.id ? '#080810' : 'var(--text-muted)',
              fontWeight: activeStage === s.id ? 700 : 400,
              flexShrink: 0,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Content */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 12, letterSpacing: 2, animation: 'pulse-red 2s ease-in-out infinite' }}>LOADING...</div>
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: 'var(--red)', fontSize: 13 }}>
          {error === 'No API key'
            ? 'ใส่ FOOTBALL_DATA_API_KEY ใน .env.local ก่อนนะ'
            : `Error: ${error}`}
        </div>
      )}

      {!loading && !error && activeStage === 'GROUP_STAGE' && standings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <GroupStage groups={standings} />
          {matches.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>
                Match Schedule
              </div>
              <MatchList matches={matches.slice(0, 20)} />
            </div>
          )}
        </div>
      )}

      {!loading && !error && activeStage !== 'GROUP_STAGE' && (
        <MatchList matches={matches} />
      )}
    </div>
  );
}

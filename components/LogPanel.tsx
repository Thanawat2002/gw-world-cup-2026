'use client';

import Image from 'next/image';
import type { Player } from '@/lib/types';
import { getRound } from '@/lib/data';

interface Props {
  dead: Player[];
}

function formatTime(ts: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LogPanel({ dead }: Props) {
  const sorted = [...dead].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="panel">
      <div className="panel-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="panel-head-title">บันทึกการ Terminate</span>
      </div>

      <div className="log-body">
        {sorted.length === 0 ? (
          <div className="log-empty">ยังไม่มีทีมตกรอบ</div>
        ) : (
          sorted.map(p => {
            const round = getRound(p.round);
            const isChamp = p.round === 'champ';
            return (
              <div key={p.id} className="log-row">
                <div className={`log-n${isChamp ? ' log-n-gold' : ''}`}>{p.order}</div>
                <Image
                  src={`https://flagcdn.com/w80/${p.flag}.png`}
                  alt={p.team}
                  width={26}
                  height={18}
                  className="log-flag"
                  unoptimized
                />
                <div className="log-info">
                  <div className="log-team">
                    {p.team} <span className="log-player-name">({p.name})</span>
                  </div>
                  <div className="log-round">{round?.label} — {round?.sub}</div>
                </div>
                <div className="log-time">{formatTime(p.ts)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

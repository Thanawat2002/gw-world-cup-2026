'use client';

import Image from 'next/image';
import type { Player } from '@/lib/types';
import { getRound } from '@/lib/data';

interface Props {
  players: Player[];
  crownedId: number | null;
}

export default function DebtPanel({ players, crownedId }: Props) {
  const sorted = [...players].sort((a, b) => {
    if (a.out && b.out) return (a.order ?? 0) - (b.order ?? 0);
    if (a.out) return -1;
    if (b.out) return 1;
    return 0;
  });

  return (
    <div className="panel">
      <div className="panel-head">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
        <span className="panel-head-title">ตารางหนี้เหล้า</span>
      </div>

      <div>
        {sorted.map(p => {
          const isDebt     = p.out && (p.order ?? 0) <= 5;
          const isSafe     = p.out && (p.order ?? 0) > 5;
          const isReceiver = p.id === crownedId && p.out && !isDebt;
          const round      = getRound(p.round);

          let numCls = '', badgeCls = 'db-alive', badgeText = 'ยังรอด';
          if (isReceiver) { numCls = 'c-gold'; badgeCls = 'db-gold'; badgeText = 'รับเหล้า'; }
          else if (isDebt) { numCls = 'c-debt'; badgeCls = 'db-debt'; badgeText = 'เลี้ยงเหล้า'; }
          else if (isSafe) { numCls = 'c-safe'; badgeCls = 'db-safe'; badgeText = 'รอด'; }

          return (
            <div key={p.id} className="debt-row">
              <div className={`debt-num ${numCls}`}>{p.out ? p.order : '—'}</div>
              <div className="debt-flag-wrap">
                <Image
                  src={`https://flagcdn.com/w80/${p.flag}.png`}
                  alt={p.team}
                  width={34}
                  height={22}
                  className="debt-flag"
                  unoptimized
                />
              </div>
              <div className="debt-info">
                <div className="debt-name">{p.name}</div>
                <div className="debt-team">{p.team}{round ? ` · ${round.label}` : ''}</div>
              </div>
              <div className={`debt-badge ${badgeCls}`}>{badgeText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

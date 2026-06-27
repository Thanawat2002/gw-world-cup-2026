'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { Player } from '@/lib/types';
import { getRound } from '@/lib/data';

interface Props {
  player: Player;
  isCrowned: boolean;
}

export default function PlayerCard({ player, isCrowned }: Props) {
  const [shaking, setShaking] = useState(false);
  const round = getRound(player.round);
  const isChamp = player.round === 'champ';
  const isDebt = player.out && (player.order ?? 0) <= 5;
  const isSafe = player.out && (player.order ?? 0) > 5;

  // Trigger shake on elimination
  const prevOut = usePrev(player.out);
  useEffect(() => {
    if (player.out && !prevOut) {
      setShaking(true);
      const t = setTimeout(() => setShaking(false), 450);
      return () => clearTimeout(t);
    }
  }, [player.out, prevOut]);

  return (
    <div
      className={[
        'player-card',
        player.out ? 'is-out' : '',
        isChamp ? 'is-champ' : '',
        isCrowned ? 'is-crown' : '',
        shaking ? 'is-shaking' : '',
      ].filter(Boolean).join(' ')}
    >
      {/* Flag */}
      <div className="card-flag-wrap">
        <Image
          src={`https://flagcdn.com/w320/${player.flag}.png`}
          alt={player.team}
          fill
          className="card-flag"
          style={{ objectFit: 'cover' }}
          unoptimized
        />
        <div className="card-flag-shade" />
      </div>

      {/* Crown */}
      {isCrowned && (
        <div className="crown-wrap">
          <svg viewBox="0 0 24 24" fill="#F59E0B" className="crown-svg">
            <path d="M2 20h20v2H2v-2zm2-2L2 6l6 4 4-8 4 8 6-4-2 12H4z" />
          </svg>
        </div>
      )}

      {/* Terminated / Champion overlay */}
      {player.out && (
        <div className="card-overlay">
          <span className={isChamp ? 'stamp stamp-gold' : 'stamp stamp-red'}>
            {isChamp ? 'CHAMPION' : 'TERMINATED'}
          </span>
        </div>
      )}

      {/* Fire */}
      <div className={player.out ? (isChamp ? 'card-fire fire-gold' : 'card-fire fire-red') : ''} />

      {/* Body */}
      <div className="card-body">
        <div className="badges">
          {!player.out && <span className="badge badge-alive">ยังรอด</span>}
          {player.out && <span className="badge badge-out">#{player.order} ตก</span>}
          {isChamp && <span className="badge badge-gold">แชมป์โลก</span>}
          {!isChamp && isDebt && <span className="badge badge-debt">เลี้ยงเหล้า</span>}
          {!isChamp && isSafe && <span className="badge badge-safe">รอด</span>}
        </div>

        <div className="card-team">{player.team}</div>
        <div className="card-player">{player.name}</div>
        {round && <div className="card-round">ตก: {round.label}</div>}

      </div>
    </div>
  );
}

function usePrev<T>(value: T): T | undefined {
  const [prev, setPrev] = useState<T | undefined>(undefined);
  useEffect(() => { setPrev(value); });
  return prev;
}

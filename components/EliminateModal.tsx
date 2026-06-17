'use client';

import { useEffect } from 'react';
import { ROUNDS } from '@/lib/data';
import type { Player } from '@/lib/types';

interface Props {
  player: Player | null;
  onConfirm: (roundId: string) => void;
  onClose: () => void;
}

export default function EliminateModal({ player, onConfirm, onClose }: Props) {
  useEffect(() => {
    if (!player) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [player, onClose]);

  if (!player) return null;

  return (
    <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-title">TERMINATE {player.team.toUpperCase()}</div>
        <div className="modal-sub">{player.name} — เลือกรอบที่ {player.team} ตกรอบ</div>

        <div className="modal-rounds">
          {ROUNDS.map(r => (
            <button
              key={r.id}
              className={`round-opt${r.id === 'champ' ? ' champ-opt' : ''}`}
              onClick={() => onConfirm(r.id)}
            >
              <div className="round-opt-label">{r.label}</div>
              <div className="round-opt-sub">{r.sub}</div>
            </button>
          ))}
        </div>

        <button className="modal-cancel" onClick={onClose}>ยกเลิก</button>
      </div>
    </div>
  );
}

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import PlayerCard from "@/components/PlayerCard"
import EliminateModal from "@/components/EliminateModal"
import DebtPanel from "@/components/DebtPanel"
import LogPanel from "@/components/LogPanel"
import StandingsPanel from "@/components/StandingsPanel"
import { useGameState } from "@/hooks/useGameState"
import type { Player } from "@/lib/types"
import { getRound } from "@/lib/data"

export default function Home() {
  const {
    state,
    hydrated,
    eliminate,
    restore,
    reset,
    dead,
    alive,
    crownedId,
    deepestEliminated,
    syncing,
    lastSyncAt,
    syncFromAPI,
  } = useGameState()
  const [modalPlayer, setModalPlayer] = useState<Player | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastKey, setToastKey] = useState(0)
  const prevDeadCount = useRef(0)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    setToastKey((k) => k + 1)
    const t = setTimeout(() => setToastMsg(null), 4000)
    return () => clearTimeout(t)
  }, [])

  // Show toast when API auto-eliminates teams
  useEffect(() => {
    const newlyDead = dead.filter(
      (p) => p.order !== null && p.order > prevDeadCount.current,
    )
    if (prevDeadCount.current > 0 && newlyDead.length > 0) {
      const names = newlyDead.map((p) => `${p.team}`).join(", ")
      showToast(`AUTO SYNC: ${names} ถูก TERMINATE แล้ว!`)
    }
    prevDeadCount.current = dead.length
  }, [dead.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEliminate = (id: number, roundId: string) => {
    eliminate(id, roundId)
    setModalPlayer(null)
    const p = state.players.find((p) => p.id === id)
    const round = getRound(roundId)
    const order = state.counter + 1
    if (p) {
      const isChamp = roundId === "champ"
      const suffix = isChamp
        ? `${p.name} แชมป์โลก!`
        : order <= 5
          ? `${p.name} ต้องเลี้ยงเหล้า!`
          : `${p.name} รอดแล้ว!`
      showToast(
        `${p.team} ${isChamp ? "CHAMPION" : "TERMINATED"} (${round?.label}) — ${suffix}`,
      )
    }
  }

  const handleRestore = (id: number) => {
    const p = state.players.find((p) => p.id === id)
    restore(id)
    if (p) showToast(`${p.team} กลับมาแล้ว`)
  }

  const handleReset = () => {
    if (!confirm("รีเซ็ตทั้งหมดใช่ไหม?")) return
    reset()
    showToast("รีเซ็ตเรียบร้อย")
  }

  // Debt alert
  const debtors = state.players.filter((p) => p.out && (p.order ?? 0) <= 5)
  const showDebtAlert = dead.length >= 5 && deepestEliminated
  const showWinBanner = alive.length === 0 && deepestEliminated

  if (!hydrated) return null

  return (
    <>
      {/* Fixed backgrounds */}
      <div className="bg-grid" />
      <div className="bg-glow" />

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <header style={{ padding: "48px 20px 20px", textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: "var(--gold)",
              marginBottom: 10,
              opacity: 0.8,
            }}
          >
            FIFA World Cup 2026 — Gentlewoman Edition
          </div>
          <h1
            className="font-bebas"
            style={{
              fontSize: "clamp(44px, 11vw, 104px)",
              lineHeight: 0.88,
              letterSpacing: 3,
              color: "var(--text)",
            }}
          >
            GW World Cup{" "}
            <em
              style={{
                fontStyle: "normal",
                color: "var(--gold)",
                textShadow:
                  "0 0 40px var(--gold-glow), 0 0 80px rgba(245,158,11,0.12)",
              }}
            >
              2026
            </em>
          </h1>
          <div
            className="font-bebas"
            style={{
              fontSize: "clamp(14px, 3.5vw, 24px)",
              letterSpacing: 8,
              color: "var(--red)",
              marginTop: 6,
              textShadow: "0 0 20px var(--red-glow)",
              animation: "pulse-red 3s ease-in-out infinite",
            }}
          >
            TERMINATOR
          </div>
        </header>

        {/* Stats bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
            flexWrap: "wrap",
            margin: "0 auto",
            padding: "0 20px",
          }}
        >
          <div className="chip">
            <span className="dot dot-green" />
            {alive.length}&nbsp;ทีมยังรอด
          </div>
          <div className="chip">
            <span className="dot dot-red" />
            {dead.length}&nbsp;ทีมตกแล้ว
          </div>
          <div className="chip">
            <span className="dot dot-gold" />
            {Math.min(dead.length, 5)}/5&nbsp;หนี้เหล้า
          </div>
          <button
            onClick={async () => {
              await syncFromAPI()
              showToast("Sync เสร็จแล้ว")
            }}
            disabled={syncing}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              color: syncing ? "var(--text-dim)" : "var(--gold)",
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 11,
              cursor: syncing ? "default" : "pointer",
              letterSpacing: 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                display: "inline-block",
                animation: syncing ? "crown-float 1s linear infinite" : "none",
                fontSize: 12,
              }}
            >
              ⟳
            </span>
            {syncing ? "SYNCING..." : "SYNC"}
            {lastSyncAt && !syncing && (
              <span style={{ opacity: 0.5, fontSize: 9 }}>
                {new Date(lastSyncAt).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Bangkok",
                })}
              </span>
            )}
          </button>
        </div>

        {/* Debt alert */}
        {showDebtAlert && (
          <div className="alert alert-debt" style={{ padding: "14px 18px" }}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div className="alert-body">
              {debtors
                .map((p) => <strong key={p.id}>{p.name}</strong>)
                .reduce(
                  (acc: React.ReactNode[], el, i) =>
                    i === 0 ? [el] : [...acc, ", ", el],
                  [],
                )}{" "}
              ต้องเลี้ยงเหล้า{" "}
              <strong>
                {deepestEliminated?.name} ({deepestEliminated?.team})
              </strong>{" "}
              ผู้เข้ารอบลึกสุด
            </div>
          </div>
        )}

        {/* Winner banner */}
        {showWinBanner && deepestEliminated && (
          <div className="alert alert-win" style={{ padding: "20px 24px" }}>
            <div className="alert-win-title">GAME OVER — FINAL VERDICT!</div>
            <div className="alert-body">
              <strong>{deepestEliminated.name}</strong> ชนะด้วยทีม{" "}
              <strong>{deepestEliminated.team}</strong>
              {getRound(deepestEliminated.round) &&
                ` (${getRound(deepestEliminated.round)?.label})`}
              <br />
              {debtors.length > 0 &&
                `${debtors.map((p) => p.name).join(", ")} ต้องเลี้ยงเหล้า!`}
            </div>
          </div>
        )}

        {/* Players grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            padding: "24px 16px 0",
            maxWidth: 1300,
            margin: "0 auto",
          }}
          className="players-grid-responsive"
        >
          {state.players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              isCrowned={p.id === crownedId}
              onEliminate={(id) =>
                setModalPlayer(state.players.find((pl) => pl.id === id) ?? null)
              }
              onRestore={handleRestore}
            />
          ))}
        </div>

        {/* Standings */}
        <div
          style={{ maxWidth: 1300, margin: "36px auto 0", padding: "0 16px" }}
        >
          <StandingsPanel />
        </div>

        {/* Bottom panels */}
        <div
          style={{
            maxWidth: 1300,
            margin: "24px auto 0",
            padding: "0 16px",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 20,
          }}
          className="bottom-grid-responsive"
        >
          <DebtPanel players={state.players} crownedId={crownedId} />
          <LogPanel dead={dead} />
        </div>

        {/* Footer */}
        <footer
          style={{
            textAlign: "center",
            padding: "56px 20px 32px",
            color: "var(--text-dim)",
            fontSize: 12,
          }}
        >
          <div>GW World Cup 2026 Terminator · Gentlewoman Internal</div>
          {/* <button
            onClick={handleReset}
            style={{ marginTop: 12, background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '6px 18px', borderRadius: 8, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--red)'; (e.target as HTMLElement).style.color = 'var(--red)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            Reset ทั้งหมด
          </button> */}
        </footer>
      </div>

      {/* Modal */}
      {modalPlayer && (
        <EliminateModal
          player={modalPlayer}
          onConfirm={(roundId) => handleEliminate(modalPlayer.id, roundId)}
          onClose={() => setModalPlayer(null)}
        />
      )}

      {/* Toast */}
      {toastMsg && (
        <div key={toastKey} className="toast">
          {toastMsg}
        </div>
      )}

      {/* Responsive grid styles */}
      <style>{`
        @media (min-width: 560px)  { .players-grid-responsive { grid-template-columns: repeat(3, 1fr) !important; gap: 14px !important; } }
        @media (min-width: 860px)  { .players-grid-responsive { grid-template-columns: repeat(4, 1fr) !important; gap: 18px !important; } }
        @media (min-width: 720px)  { .bottom-grid-responsive  { grid-template-columns: 1fr 1fr !important; } }
      `}</style>
    </>
  )
}

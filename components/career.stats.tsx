"use client"

import { useMemo, useState } from "react"
import { getH2H, type MatchRecord } from "@/lib/career"
import { H2HModal } from "./h2h-modal"

interface CareerStatsProps {
  history: MatchRecord[]
  titles: number
  bestRank: number
  matchesWon: number
  matchesLost: number
  points: number
}

interface RivalSummary {
  opponentId: string
  opponentName: string
  wins: number
  losses: number
  totalMatches: number
}

export function CareerStats({ history, titles, bestRank, matchesWon, matchesLost, points }: CareerStatsProps) {
  const [selectedRival, setSelectedRival] = useState<{ id: string; name: string } | null>(null)

  const winRate = matchesWon + matchesLost > 0
    ? Math.round((matchesWon / (matchesWon + matchesLost)) * 100)
    : 0

  const topRivals = useMemo<RivalSummary[]>(() => {
    const byOpponent: Record<string, RivalSummary> = {}
    for (const m of history) {
      if (!m.opponentId) continue
      const entry = byOpponent[m.opponentId] ?? {
        opponentId: m.opponentId,
        opponentName: m.opponent,
        wins: 0,
        losses: 0,
        totalMatches: 0,
      }
      entry.totalMatches += 1
      if (m.won) entry.wins += 1
      else entry.losses += 1
      byOpponent[m.opponentId] = entry
    }
    return Object.values(byOpponent)
      .sort((a, b) => b.totalMatches - a.totalMatches)
      .slice(0, 8)
  }, [history])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-extrabold uppercase tracking-tight">Estadísticas de carrera</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Récord" value={`${matchesWon}-${matchesLost}`} sub={`${winRate}% victorias`} />
        <StatCard label="Títulos" value={String(titles)} />
        <StatCard label="Mejor ranking" value={`#${bestRank}`} />
        <StatCard label="Puntos actuales" value={points.toLocaleString()} />
      </div>

      {/* Top rivals */}
      <div>
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Rivalidades más jugadas
        </h3>
        {topRivals.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay suficientes partidos para mostrar rivalidades.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {topRivals.map((r) => (
              <button
                key={r.opponentId}
                type="button"
                onClick={() => setSelectedRival({ id: r.opponentId, name: r.opponentName })}
                className="flex w-full items-center justify-between border-b border-border/60 px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-secondary/40"
              >
                <span className="font-semibold">{r.opponentName}</span>
                <span className="font-mono font-bold tabular-nums text-muted-foreground">
                  {r.wins}-{r.losses}
                  <span className="ml-2 text-xs font-normal">({r.totalMatches} partidos)</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedRival && (
        <H2HModal
          opponentId={selectedRival.id}
          opponentName={selectedRival.name}
          opponentNationality=""
          history={history}
          onClose={() => setSelectedRival(null)}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

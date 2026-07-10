"use client"

import { X } from "lucide-react"
import { getH2H, type MatchRecord } from "@/lib/career"
import { getNationality, SURFACE_LABELS, type Surface } from "@/lib/types"
import { cn } from "@/lib/utils"

interface H2HModalProps {
  opponentId: string
  opponentName: string
  opponentNationality: string
  history: MatchRecord[]
  onClose: () => void
}

export function H2HModal({ opponentId, opponentName, opponentNationality, history, onClose }: H2HModalProps) {
  const stats = getH2H(history, opponentId)
  const nat = getNationality(opponentNationality)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Head-to-Head</p>
            <h3 className="text-xl font-extrabold">
              {nat?.flag} {opponentName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {stats.totalMatches === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Todavía no se enfrentaron. El historial aparecerá acá después del primer partido.
          </p>
        ) : (
          <>
            {/* Overall record */}
            <div className="mb-5 flex items-center justify-center gap-6 rounded-lg bg-secondary/40 py-4">
              <div className="text-center">
                <p className="text-3xl font-extrabold text-primary tabular-nums">{stats.wins}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ganados</p>
              </div>
              <div className="text-2xl font-bold text-muted-foreground">-</div>
              <div className="text-center">
                <p className="text-3xl font-extrabold text-destructive tabular-nums">{stats.losses}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perdidos</p>
              </div>
            </div>

            {/* By surface */}
            {Object.keys(stats.bySurface).length > 0 && (
              <div className="mb-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Por superficie
                </p>
                <div className="space-y-1.5">
                  {(Object.entries(stats.bySurface) as [Surface, { wins: number; losses: number }][]).map(
                    ([surface, rec]) => (
                      <div key={surface} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{SURFACE_LABELS[surface]}</span>
                        <span className="font-mono font-semibold tabular-nums">
                          {rec.wins}-{rec.losses}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}

            {/* Last meetings */}
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Últimos enfrentamientos
              </p>
              <div className="space-y-1.5">
                {stats.lastMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{m.tournament}</p>
                      <p className="text-muted-foreground">
                        {m.round} · {SURFACE_LABELS[m.surface]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded px-2 py-0.5 font-bold uppercase",
                        m.won ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive",
                      )}
                    >
                      {m.won ? "W" : "L"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

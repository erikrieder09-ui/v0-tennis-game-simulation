"use client"

import { useState } from "react"
import { getH2H, type MatchRecord } from "@/lib/career"
import { getNationality } from "@/lib/types"
import { H2HModal } from "./h2h-modal"

interface OpponentLike {
  id: string
  firstName: string
  lastName: string
  nationality: string
}

interface H2HBadgeProps {
  opponent: OpponentLike
  history: MatchRecord[]
}

/** Franja compacta que muestra el historial contra el rival antes de arrancar un partido. */
export function H2HBadge({ opponent, history }: H2HBadgeProps) {
  const [showModal, setShowModal] = useState(false)

  // No mostrar nada si el rival no tiene un id válido (p. ej. bots genéricos sin historial rastreado).
  if (!opponent?.id) return null

  const stats = getH2H(history, opponent.id)
  const nat = getNationality(opponent.nationality)
  const opponentName = `${opponent.firstName} ${opponent.lastName}`

  if (stats.totalMatches === 0) {
    return (
      <div className="rounded-lg border border-border/60 bg-secondary/20 px-4 py-2.5 text-xs text-muted-foreground">
        Primer enfrentamiento contra {nat?.flag} {opponentName}.
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-secondary/20 px-4 py-2.5 text-left text-xs transition-colors hover:bg-secondary/40"
      >
        <span className="text-muted-foreground">
          H2H vs {nat?.flag} {opponentName}
        </span>
        <span className="font-mono font-bold tabular-nums">
          {stats.wins}-{stats.losses}
        </span>
      </button>

      {showModal && (
        <H2HModal
          opponentId={opponent.id}
          opponentName={opponentName}
          opponentNationality={opponent.nationality}
          history={history}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}

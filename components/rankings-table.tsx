"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { computeOverall } from "@/lib/attributes"
import { divisionForRank, getRankings } from "@/lib/rivals"
import type { MatchRecord } from "@/lib/career"
import {
  getNationality,
  PLAY_STYLES,
  SURFACE_LABELS,
  type Division,
  type PlayerProfile,
  type Rival,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { H2HModal } from "./h2h-modal"

const DIVISION_META: Record<Division, { label: string; cls: string }> = {
  "grand-slam": { label: "Grand Slam", cls: "bg-primary/20 text-primary" },
  masters: { label: "Masters", cls: "bg-accent/20 text-accent" },
  tour: { label: "Tour", cls: "bg-chart-3/20 text-chart-3" },
  challenger: { label: "Challenger", cls: "bg-muted text-muted-foreground" },
  futures: { label: "Futures", cls: "bg-muted text-muted-foreground" },
}

const FILTERS: { id: "all" | Division; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "grand-slam", label: "Grand Slam" },
  { id: "masters", label: "Masters" },
  { id: "tour", label: "Tour" },
  { id: "challenger", label: "Challenger" },
  { id: "futures", label: "Futures" },
]

function injuryLabel(v: number) {
  if (v < 25) return { label: "Muy baja", cls: "text-primary" }
  if (v < 45) return { label: "Baja", cls: "text-chart-3" }
  if (v < 65) return { label: "Media", cls: "text-accent" }
  return { label: "Alta", cls: "text-destructive" }
}

interface Row extends Rival {
  isUser?: boolean
}

interface RankingsTableProps {
  player: PlayerProfile
  /** historial de partidos del usuario, para poder mostrar el H2H al hacer click en un rival */
  history?: MatchRecord[]
}

export function RankingsTable({ player, history = [] }: RankingsTableProps) {
  const [filter, setFilter] = useState<"all" | Division>("all")
  const [query, setQuery] = useState("")
  const [selectedRival, setSelectedRival] = useState<Row | null>(null)

  const rows = useMemo<Row[]>(() => {
    const base = getRankings(player.tour)
    const userOverall = computeOverall(player.attributes, player.playStyle)

    // Insert the user's player into the ladder ordered by overall.
    const userRow: Row = {
  id: "USER",
  tour: player.tour,
  firstName: player.firstName,
  lastName: player.lastName,
  nationality: player.nationality,
  age: player.age,
  handedness: player.handedness,
  backhand: player.backhand,
  height: player.height,
  weight: player.weight,
  playStyle: player.playStyle,
  attributes: player.attributes,
  overall: userOverall,
  rank: 0,
  points: 0,
  favSurface: "hard",
  injuryProneness: 20,
  currentAbility: userOverall,
  potentialAbility: userOverall + 5,
  retirementDate: null,
  isUser: true,
}

    const merged = [...base, userRow].sort(
      (a, b) => b.overall - a.overall || a.lastName.localeCompare(b.lastName),
    )
    // Reassign ranks after insertion.
    merged.forEach((r, i) => {
      r.rank = i + 1
    })
    return merged
  }, [player])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== "all" && divisionForRank(r.rank) !== filter) return false
      if (q) {
        const name = `${r.firstName} ${r.lastName}`.toLowerCase()
        if (!name.includes(q)) return false
      }
      return true
    })
  }, [rows, filter, query])

  const userRank = rows.find((r) => r.isUser)?.rank ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold uppercase tracking-tight">Ranking mundial {player.tour}</h2>
          <p className="text-sm text-muted-foreground">
            250 jugadores en el circuito. Estás en el puesto{" "}
            <span className="font-bold text-primary">#{userRank}</span>.
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar jugador…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Division filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors",
              filter === f.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-muted-foreground/60",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="hidden grid-cols-[48px_1fr_120px_88px_64px_84px] gap-3 border-b border-border bg-secondary/40 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground md:grid">
          <span>#</span>
          <span>Jugador</span>
          <span>Estilo</span>
          <span className="text-right">Superficie</span>
          <span className="text-right">OVR</span>
          <span className="text-right">Lesión</span>
        </div>
        <div className="max-h-[640px] overflow-y-auto">
          {filtered.map((r) => {
            const nat = getNationality(r.nationality)
            const div = divisionForRank(r.rank)
            const inj = injuryLabel(r.injuryProneness)
            const styleLabel = PLAY_STYLES.find((s) => s.id === r.playStyle)?.label ?? ""
            return (
              <div
                key={r.id}
                onClick={() => !r.isUser && setSelectedRival(r)}
                className={cn(
                  "grid grid-cols-[40px_1fr_56px] items-center gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-0 md:grid-cols-[48px_1fr_120px_88px_64px_84px]",
                  r.isUser && "bg-primary/10",
                  !r.isUser && "cursor-pointer hover:bg-secondary/40",
                )}
              >
                <span className="font-mono font-bold tabular-nums">{r.rank}</span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span>{nat?.flag}</span>
                    <span className={cn("truncate font-semibold", r.isUser && "text-primary")}>
                      {r.firstName} {r.lastName}
                      {r.isUser && <span className="ml-1 text-xs font-bold uppercase">(Vos)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                        DIVISION_META[div].cls,
                      )}
                    >
                      {DIVISION_META[div].label}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {r.points.toLocaleString()} pts
                    </span>
                  </div>
                </div>

                <span className="hidden truncate text-xs text-muted-foreground md:block">{styleLabel}</span>
                <span className="hidden text-right text-xs text-muted-foreground md:block">
                  {SURFACE_LABELS[r.favSurface]}
                </span>
                <span className="text-right font-mono font-bold tabular-nums">{r.overall}</span>
                <span className={cn("hidden text-right text-xs font-semibold md:block", inj.cls)}>
                  {inj.label}
                </span>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}
        </div>
      </div>

      {selectedRival && (
        <H2HModal
          opponentId={selectedRival.id}
          opponentName={`${selectedRival.firstName} ${selectedRival.lastName}`}
          opponentNationality={selectedRival.nationality}
          history={history}
          onClose={() => setSelectedRival(null)}
        />
      )}
    </div>
  )
}

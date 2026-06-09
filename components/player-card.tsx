import type { PlayerProfile } from "@/lib/types"
import { PLAY_STYLES, getNationality } from "@/lib/types"
import { computeOverall } from "@/lib/attributes"
import { AttributeBars } from "./attribute-bars"

function detailRow(label: string, value: string) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

export function PlayerCard({ player }: { player: PlayerProfile }) {
  const nat = getNationality(player.nationality)
  const overall = computeOverall(player.attributes, player.playStyle)
  const styleLabel = PLAY_STYLES.find((s) => s.id === player.playStyle)?.label ?? ""

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Header banner */}
      <div className="relative flex items-center gap-4 border-b border-border bg-secondary/40 p-5 sm:p-6">
        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="font-mono text-3xl font-extrabold leading-none">{overall}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest">OVR</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-background">
              {player.tour}
            </span>
            <span className="text-sm text-muted-foreground">
              {nat?.flag} {nat?.name}
            </span>
          </div>
          <h2 className="mt-1 truncate text-2xl font-extrabold uppercase leading-tight tracking-tight text-balance sm:text-3xl">
            {player.firstName} {player.lastName}
          </h2>
          <p className="text-sm font-medium text-primary">{styleLabel}</p>
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 md:grid-cols-2">
        {/* Bio details */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Ficha</h3>
          <div className="rounded-lg border border-border bg-background/40 px-3">
            {detailRow("Edad", `${player.age} años`)}
            {detailRow("Altura", `${player.height} cm`)}
            {detailRow("Peso", `${player.weight} kg`)}
            {detailRow("Mano hábil", player.handedness === "right" ? "Diestro" : "Zurdo")}
            {detailRow("Revés", player.backhand === "two" ? "A dos manos" : "A una mano")}
          </div>
        </div>

        {/* Attributes */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">Atributos</h3>
          <AttributeBars attributes={player.attributes} />
        </div>
      </div>
    </div>
  )
}

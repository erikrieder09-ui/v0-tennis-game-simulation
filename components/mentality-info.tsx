import { Card } from "@/components/ui/card"

const VIA_EXP = [
  { label: "Ganar un tiebreak", value: "+1 a +3" },
  { label: "Remontar un set en contra", value: "+2 a +3" },
  { label: "Ganar un partido ajustado", value: "+1 a +2" },
  { label: "Ceder un momento clave", value: "−1 a −2" },
]

export function MentalityInfo() {
  return (
    <Card className="border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
          Sistema
        </span>
        <h3 className="text-xl font-extrabold uppercase tracking-tight">Mentalidad</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        La mentalidad sube por dos vías, a ritmos distintos. No se puede &quot;farmear&quot; sin competir de verdad.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Via experiencia */}
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-primary">Vía experiencia</h4>
          <p className="mt-1 text-xs text-muted-foreground">Automática y más rápida. Se gana viviendo partidos.</p>
          <ul className="mt-3 space-y-2">
            {VIA_EXP.map((row) => (
              <li key={row.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-foreground/90">{row.label}</span>
                <span className="font-mono font-semibold text-primary">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Via entrenamiento */}
        <div className="rounded-lg border border-border bg-background/40 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-accent">Vía entrenamiento</h4>
          <p className="mt-1 text-xs text-muted-foreground">Elegida y más lenta. Sesión semanal de &quot;Trabajo mental&quot;.</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="text-foreground/90">Máximo por sesión</span>
              <span className="font-mono font-semibold text-accent">+1</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-foreground/90">Rendimiento decreciente</span>
              <span className="font-mono font-semibold text-accent">cuanto más alta</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Un jugador joven puede tener mentalidad baja aunque la entrene, hasta que empiece a vivir partidos difíciles
            de verdad.
          </p>
        </div>
      </div>
    </Card>
  )
}

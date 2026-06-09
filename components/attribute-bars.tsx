import type { AttributeSet } from "@/lib/types"
import { ATTRIBUTE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

function ratingColor(value: number) {
  if (value >= 80) return "bg-primary"
  if (value >= 70) return "bg-accent"
  if (value >= 60) return "bg-chart-3"
  return "bg-muted-foreground"
}

export function AttributeBars({
  attributes,
  columns = 1,
}: {
  attributes: AttributeSet
  columns?: 1 | 2
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3", columns === 2 && "sm:grid-cols-2")}>
      {ATTRIBUTE_LABELS.map(({ key, label }) => {
        const value = attributes[key]
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", ratingColor(value))}
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right font-mono text-sm font-semibold tabular-nums">{value}</span>
          </div>
        )
      })}
    </div>
  )
}

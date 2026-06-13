"use client"

import { useMemo, useState } from "react"
import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AttributeBars } from "@/components/attribute-bars"
import { computeAttributes, computeOverall } from "@/lib/attributes"
import {
  NATIONALITIES,
  PLAY_STYLES,
  type Backhand,
  type Handedness,
  type PlayStyle,
  type PlayerProfile,
  type Tour,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const STEPS = ["Circuito", "Identidad", "Juego", "Físico", "Estilo"]

interface Draft {
  tour: Tour
  firstName: string
  lastName: string
  nationality: string
  handedness: Handedness
  backhand: Backhand
  height: number
  weight: number
  age: number
  playStyle: PlayStyle | null
}

const DEFAULT_DRAFT: Draft = {
  tour: "ATP",
  firstName: "",
  lastName: "",
  nationality: "ESP",
  handedness: "right",
  backhand: "two",
  height: 185,
  weight: 78,
  age: 18,
  playStyle: null,
}

function OptionCard({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  title: string
  subtitle?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-lg border-2 p-4 text-left transition-all",
        active
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-muted-foreground/50",
      )}
    >
      <span className="font-bold uppercase tracking-tight">{title}</span>
      {subtitle && <span className="mt-1 text-sm text-muted-foreground">{subtitle}</span>}
    </button>
  )
}

function StepperSlider({
  label,
  unit,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  unit: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-lg font-bold">
          {value} {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-9 shrink-0 bg-transparent"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label={`Disminuir ${label}`}
        >
          <Minus className="size-4" />
        </Button>
        <Slider
          className="flex-1"
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={([v]) => onChange(v)}
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="size-9 shrink-0 bg-transparent"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label={`Aumentar ${label}`}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export function PlayerCreator({
  onComplete,
}: {
  onComplete: (player: PlayerProfile) => void
}) {
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT)

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  // WTA tends to be shorter on average; nudge defaults when switching tours.
  function setTour(tour: Tour) {
    setDraft((d) => ({
      ...d,
      tour,
      height: tour === "WTA" ? 170 : 183,
      weight: tour === "WTA" ? 63 : 78,
    }))
  }

  const heightRange = draft.tour === "WTA" ? [150, 195] : [170, 210]
  const weightRange = draft.tour === "WTA" ? [50, 85] : [60, 105]

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return draft.firstName.trim().length > 0 && draft.lastName.trim().length > 0
      case 4:
        return draft.playStyle !== null
      default:
        return true
    }
  }, [step, draft])

  // Effective style for the live preview: fall back to a neutral "all-around"
  // baseline until the player actually picks a style.
  const effectiveStyle: PlayStyle = draft.playStyle ?? "all-around"

  const previewAttrs = useMemo(
    () =>
      computeAttributes({
        tour: draft.tour,
        playStyle: effectiveStyle,
        height: draft.height,
        weight: draft.weight,
        age: draft.age,
        handedness: draft.handedness,
        backhand: draft.backhand,
      }),
    [draft, effectiveStyle],
  )

  const previewOverall = useMemo(
    () => computeOverall(previewAttrs, effectiveStyle),
    [previewAttrs, effectiveStyle],
  )

  const nat = NATIONALITIES.find((n) => n.code === draft.nationality)
  const styleLabel = PLAY_STYLES.find((s) => s.id === draft.playStyle)?.label

  function finish() {
    if (!draft.playStyle) return
    onComplete({
      tour: draft.tour,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      nationality: draft.nationality,
      handedness: draft.handedness,
      backhand: draft.backhand,
      height: draft.height,
      weight: draft.weight,
      age: draft.age,
      playStyle: draft.playStyle,
      attributes: previewAttrs,
    })
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
      {/* LEFT: wizard */}
      <div>
        {/* Step indicator */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-1.5">
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-muted",
                )}
              />
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest",
                  i === step ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <div className="min-h-[340px]">
          {/* STEP 0 - Tour */}
          {step === 0 && (
            <div>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight">Elegí tu circuito</h2>
              <p className="mt-1 text-muted-foreground">¿En qué tour vas a forjar tu carrera?</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <OptionCard
                  active={draft.tour === "ATP"}
                  onClick={() => setTour("ATP")}
                  title="ATP"
                  subtitle="Circuito masculino"
                />
                <OptionCard
                  active={draft.tour === "WTA"}
                  onClick={() => setTour("WTA")}
                  title="WTA"
                  subtitle="Circuito femenino"
                />
              </div>
            </div>
          )}

          {/* STEP 1 - Identity */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-extrabold uppercase tracking-tight">Identidad</h2>
                <p className="mt-1 text-muted-foreground">Nombre y nacionalidad de tu jugador.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombre</Label>
                  <Input
                    id="firstName"
                    value={draft.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                    placeholder="Carlos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input
                    id="lastName"
                    value={draft.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                    placeholder="Gómez"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nacionalidad</Label>
                <Select value={draft.nationality} onValueChange={(v) => set("nationality", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {NATIONALITIES.map((n) => (
                      <SelectItem key={n.code} value={n.code}>
                        {n.flag} {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2 - Game (handedness / backhand) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-extrabold uppercase tracking-tight">Empuñadura</h2>
                <p className="mt-1 text-muted-foreground">Mano hábil y tipo de revés.</p>
              </div>
              <div>
                <Label className="mb-3 block">Mano hábil</Label>
                <div className="grid grid-cols-2 gap-4">
                  <OptionCard active={draft.handedness === "right"} onClick={() => set("handedness", "right")} title="Diestro" />
                  <OptionCard active={draft.handedness === "left"} onClick={() => set("handedness", "left")} title="Zurdo" />
                </div>
              </div>
              <div>
                <Label className="mb-3 block">Revés</Label>
                <div className="grid grid-cols-2 gap-4">
                  <OptionCard
                    active={draft.backhand === "two"}
                    onClick={() => set("backhand", "two")}
                    title="Dos manos"
                    subtitle="Más sólido y consistente"
                  />
                  <OptionCard
                    active={draft.backhand === "one"}
                    onClick={() => set("backhand", "one")}
                    title="Una mano"
                    subtitle="Más alcance, slice y volea"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 - Physique */}
          {step === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-extrabold uppercase tracking-tight">Físico</h2>
                <p className="mt-1 text-muted-foreground">Altura, peso y edad (16-20). Mové la barra o usá los botones.</p>
              </div>
              <StepperSlider
                label="Altura"
                unit="cm"
                value={draft.height}
                min={heightRange[0]}
                max={heightRange[1]}
                onChange={(v) => set("height", v)}
              />
              <StepperSlider
                label="Peso"
                unit="kg"
                value={draft.weight}
                min={weightRange[0]}
                max={weightRange[1]}
                onChange={(v) => set("weight", v)}
              />
              <StepperSlider
                label="Edad"
                unit="años"
                value={draft.age}
                min={16}
                max={20}
                onChange={(v) => set("age", v)}
              />
            </div>
          )}

          {/* STEP 4 - Play style */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-extrabold uppercase tracking-tight">Estilo de juego</h2>
                <p className="mt-1 text-muted-foreground">Define cómo dominás la cancha. Mirá cómo cambian tus atributos.</p>
              </div>
              <div className="grid gap-3">
                {PLAY_STYLES.map((s) => (
                  <OptionCard
                    key={s.id}
                    active={draft.playStyle === s.id}
                    onClick={() => set("playStyle", s.id)}
                    title={s.label}
                    subtitle={s.description}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            Atrás
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
              Continuar
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canProceed}>
              Crear jugador
            </Button>
          )}
        </div>
      </div>

      {/* RIGHT: live preview */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Vista previa
            </span>
            <span className="rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {draft.tour}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-mono text-2xl font-extrabold leading-none">{previewOverall}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest">OVR</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold uppercase tracking-tight">
                {draft.firstName || draft.lastName
                  ? `${draft.firstName} ${draft.lastName}`.trim()
                  : "Tu jugador"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {nat?.flag} {nat?.name}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Edad</span>
              <span className="font-mono font-semibold">{draft.age}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mano</span>
              <span className="font-semibold">{draft.handedness === "right" ? "Diestro" : "Zurdo"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Altura</span>
              <span className="font-mono font-semibold">{draft.height} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revés</span>
              <span className="font-semibold">{draft.backhand === "two" ? "2 manos" : "1 mano"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peso</span>
              <span className="font-mono font-semibold">{draft.weight} kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estilo</span>
              <span className="truncate font-semibold">{styleLabel ?? "—"}</span>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          <AttributeBars attributes={previewAttrs} />

          {!draft.playStyle && (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Estimación con base neutral. Elegí un estilo de juego para afinar los atributos.
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

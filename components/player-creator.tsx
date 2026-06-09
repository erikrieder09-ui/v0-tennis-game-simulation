"use client"

import { useMemo, useState } from "react"
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
import { computeAttributes } from "@/lib/attributes"
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
      height: tour === "WTA" ? 172 : 185,
      weight: tour === "WTA" ? 63 : 78,
    }))
  }

  const heightRange = draft.tour === "WTA" ? [155, 192] : [165, 211]
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

  // Live preview attributes (depends on style being chosen)
  const previewAttrs = useMemo(() => {
    if (!draft.playStyle) return null
    return computeAttributes({
      tour: draft.tour,
      playStyle: draft.playStyle,
      height: draft.height,
      weight: draft.weight,
      age: draft.age,
      handedness: draft.handedness,
      backhand: draft.backhand,
    })
  }, [draft])

  function finish() {
    if (!draft.playStyle || !previewAttrs) return
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
    <div className="mx-auto w-full max-w-2xl">
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
              <p className="mt-1 text-muted-foreground">Altura, peso y edad (16-20).</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label>Altura</Label>
                <span className="font-mono text-lg font-bold">{draft.height} cm</span>
              </div>
              <Slider
                value={[draft.height]}
                min={heightRange[0]}
                max={heightRange[1]}
                step={1}
                onValueChange={([v]) => set("height", v)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label>Peso</Label>
                <span className="font-mono text-lg font-bold">{draft.weight} kg</span>
              </div>
              <Slider
                value={[draft.weight]}
                min={weightRange[0]}
                max={weightRange[1]}
                step={1}
                onValueChange={([v]) => set("weight", v)}
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <Label>Edad</Label>
                <span className="font-mono text-lg font-bold">{draft.age} años</span>
              </div>
              <Slider
                value={[draft.age]}
                min={16}
                max={20}
                step={1}
                onValueChange={([v]) => set("age", v)}
              />
            </div>
          </div>
        )}

        {/* STEP 4 - Play style */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight">Estilo de juego</h2>
              <p className="mt-1 text-muted-foreground">Define cómo dominás la cancha.</p>
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
            {previewAttrs && (
              <p className="text-center text-sm text-muted-foreground">
                Los atributos se calculan según tu físico, edad y estilo. Podrás verlos en la ficha.
              </p>
            )}
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
  )
}

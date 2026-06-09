"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PlayerCreator } from "@/components/player-creator"
import { PlayerCard } from "@/components/player-card"
import { MentalityInfo } from "@/components/mentality-info"
import { useLocalStorage } from "@/lib/use-local-storage"
import type { PlayerProfile } from "@/lib/types"

export default function Page() {
  const [player, setPlayer, loaded] = useLocalStorage<PlayerProfile | null>("tennis-career-player", null)
  const [creating, setCreating] = useState(false)

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Cargando…</div>
  }

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-primary font-mono text-sm font-extrabold text-primary-foreground">
              T
            </span>
            <span className="text-lg font-extrabold uppercase tracking-tight">
              Match Point <span className="text-primary">Career</span>
            </span>
          </div>
          {player && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("¿Borrar tu jugador y empezar de nuevo?")) {
                  setPlayer(null)
                  setCreating(true)
                }
              }}
            >
              Reiniciar
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        {/* No player yet, not creating: landing */}
        {!player && !creating && (
          <section className="mx-auto max-w-2xl text-center">
            <span className="inline-block rounded-full border border-border px-3 py-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Modo carrera · Simulación
            </span>
            <h1 className="mt-5 text-balance text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Construí una <span className="text-primary">leyenda</span> del tenis
            </h1>
            <p className="mt-4 text-pretty text-lg text-muted-foreground">
              Creá tu propio jugador, elegí ATP o WTA, definí su estilo y llevalo desde los Futures hasta lo más alto
              del ranking mundial.
            </p>
            <Button size="lg" className="mt-8" onClick={() => setCreating(true)}>
              Crear mi jugador
            </Button>
            <div className="mt-12 text-left">
              <MentalityInfo />
            </div>
          </section>
        )}

        {/* Creating */}
        {!player && creating && (
          <PlayerCreator
            onComplete={(p) => {
              setPlayer(p)
              setCreating(false)
            }}
          />
        )}

        {/* Player exists: dashboard */}
        {player && (
          <section className="space-y-8">
            <div>
              <h1 className="text-3xl font-extrabold uppercase tracking-tight">Tu jugador</h1>
              <p className="text-muted-foreground">Esta es la ficha base con la que arrancás el circuito.</p>
            </div>
            <PlayerCard player={player} />
            <MentalityInfo />
          </section>
        )}
      </div>
    </main>
  )
}

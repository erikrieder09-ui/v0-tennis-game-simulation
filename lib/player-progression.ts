import type { Rival } from "./types"

export function evolvePlayer(player: Rival): Rival {
  let newCA = player.currentAbility

  // Jóvenes: progresan rápido
  if (player.age <= 22 && newCA < player.potentialAbility) {
    if (Math.random() < 0.35) newCA++
  }

  // Edad ideal: progreso lento
  else if (player.age <= 28 && newCA < player.potentialAbility) {
    if (Math.random() < 0.15) newCA++
  }

  // Veteranos
  else if (player.age >= 34) {
    if (Math.random() < 0.20) newCA--
  }

  return {
    ...player,
    currentAbility: newCA,
    overall: newCA,
  }
}
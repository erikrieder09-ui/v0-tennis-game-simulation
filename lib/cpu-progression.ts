import type { Rival } from "./types"

export function progressCpuPlayer(player: Rival): Rival {
  let ca = player.currentAbility
  const pa = player.potentialAbility

  // Jóvenes mejoran más
  let growth = 0

  if (player.age <= 20) growth = 0.8
  else if (player.age <= 24) growth = 0.5
  else if (player.age <= 29) growth = 0.2
  else if (player.age >= 34) growth = -0.3

  // Nunca superar el potencial
  ca = Math.min(pa, ca + growth)

  return {
    ...player,
    currentAbility: Math.round(ca * 10) / 10,
    overall: Math.round(ca),
  }
}
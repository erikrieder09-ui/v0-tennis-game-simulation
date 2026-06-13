import type { Rival } from "./types"
import type { Tournament } from "./calendar"
import { CATEGORY_INFO } from "./calendar"

export function generateTournamentField(
  tournament: Tournament,
  allPlayers: Rival[],
  userPlayer: Rival
): Rival[] {

  const info = CATEGORY_INFO[tournament.category]

  // jugadores aptos para cuadro principal
  let candidates = allPlayers.filter(
    p => p.rank <= info.directEntryRank
  )

  // evitar top jugando Challengers/Futures
  if (tournament.category === "challenger") {
    candidates = candidates.filter(p => p.rank > 40)
  }

  if (tournament.category === "futures") {
    candidates = candidates.filter(p => p.rank > 120)
  }

  // ordenar por ranking
  candidates.sort((a,b)=>a.rank-b.rank)

  // llenar cuadro
  const field = candidates.slice(0, info.drawSize)

  // si el usuario entra directo y aún no está:
  if (
    userPlayer.rank <= info.directEntryRank &&
    !field.some(p=>p.id===userPlayer.id)
  ) {
    field.pop()
    field.push(userPlayer)
  }

  return field
}

export function userNeedsQualy(
  tournament: Tournament,
  userRank: number
) {

  const info = CATEGORY_INFO[tournament.category]

  if (userRank <= info.directEntryRank) {
    return false
  }

  if (
    info.hasQualy &&
    userRank <= info.qualyEntryRank
  ) {
    return true
  }

  return null
}
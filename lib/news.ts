import type { Tour } from "./types"

export type NewsCategory =
  | "tournament-result"
  | "user-milestone"
  | "injury"
  | "retirement"
  | "rising-star"
  | "rivalry"
  | "ranking-move"
  | "preview"

export interface NewsItem {
  id: string
  date: string
  category: NewsCategory
  headline: string
  body: string
  emoji: string
}

export const CATEGORY_EMOJI: Record<NewsCategory, string> = {
  "tournament-result": "🏆",
  "user-milestone":    "⭐",
  "injury":            "🤕",
  "retirement":        "👴",
  "rising-star":       "🌟",
  "rivalry":           "⚔️",
  "ranking-move":      "📈",
  "preview":           "📰",
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9)
}

/* -------------------------------------------------------------------------- */
/*  Generadores de noticias                                                    */
/* -------------------------------------------------------------------------- */

export function newsTournamentResult(
  tournamentName: string,
  winner: string,
  finalist: string,
  date: string
): NewsItem {
  const bodies = [
    `${winner} se llevó el título en ${tournamentName} tras derrotar a ${finalist} en la final.`,
    `Victoria de ${winner} en ${tournamentName}. ${finalist} no pudo frenar al campeón.`,
    `${winner} conquistó ${tournamentName} y sigue en racha. ${finalist} fue finalista.`,
  ]
  return {
    id: makeId(), date, category: "tournament-result", emoji: "🏆",
    headline: `${winner} gana ${tournamentName}`,
    body: bodies[Math.floor(Math.random() * bodies.length)],
  }
}

export function newsUserMilestone(
  playerName: string,
  milestone: string,
  date: string
): NewsItem {
  return {
    id: makeId(), date, category: "user-milestone", emoji: "⭐",
    headline: `Hito: ${milestone}`,
    body: `${playerName} ${milestone.toLowerCase()}.`,
  }
}

export function newsInjury(
  playerName: string,
  injuryLabel: string,
  weeksOut: number,
  date: string
): NewsItem {
  return {
    id: makeId(), date, category: "injury", emoji: "🤕",
    headline: `${playerName} se lesiona`,
    body: `${playerName} sufrió una ${injuryLabel.toLowerCase()} y estará fuera ${weeksOut} semana${weeksOut > 1 ? "s" : ""}.`,
  }
}

export function newsRetirement(playerName: string, age: number, date: string): NewsItem {
  const bodies = [
    `${playerName} anunció su retiro del tenis profesional a los ${age} años. Una carrera para el recuerdo.`,
    `El fin de una era: ${playerName} se despide del circuito a los ${age} años.`,
    `${playerName} cuelga la raqueta a los ${age} años tras una destacada carrera.`,
  ]
  return {
    id: makeId(), date, category: "retirement", emoji: "👴",
    headline: `${playerName} se retira del tenis`,
    body: bodies[Math.floor(Math.random() * bodies.length)],
  }
}

export function newsRisingStar(playerName: string, rank: number, age: number, date: string): NewsItem {
  return {
    id: makeId(), date, category: "rising-star", emoji: "🌟",
    headline: `${playerName} irrumpe en el top ${rank}`,
    body: `Con solo ${age} años, ${playerName} alcanza el top ${rank} del ranking mundial. Una de las grandes promesas del circuito.`,
  }
}

export function newsRankingMove(
  playerName: string,
  oldRank: number,
  newRank: number,
  date: string
): NewsItem {
  const up = newRank < oldRank
  return {
    id: makeId(), date, category: "ranking-move", emoji: "📈",
    headline: `${playerName} ${up ? "sube" : "cae"} al #${newRank}`,
    body: `${playerName} ${up ? `sube ${oldRank - newRank} posiciones` : `cae ${newRank - oldRank} posiciones`} y se ubica en el puesto #${newRank} del ranking mundial.`,
  }
}

export function newsPreview(
  player1: string,
  player2: string,
  tournamentName: string,
  round: string,
  date: string
): NewsItem {
  return {
    id: makeId(), date, category: "preview", emoji: "📰",
    headline: `${player1} vs ${player2} en ${round} de ${tournamentName}`,
    body: `Uno de los partidos más atractivos de la semana enfrenta a ${player1} con ${player2} en ${tournamentName}. Un duelo que promete.`,
  }
}

/** Chequear hitos del usuario y generar noticias */
export function checkUserMilestones(
  playerName: string,
  currentRank: number,
  prevRank: number,
  matchesWon: number,
  titles: number,
  date: string
): NewsItem[] {
  const news: NewsItem[] = []

  const milestones = [200, 150, 100, 75, 50, 30, 20, 10, 5, 3, 1]
  for (const m of milestones) {
    if (currentRank <= m && prevRank > m) {
      news.push(newsUserMilestone(playerName, `alcanza el top ${m} por primera vez`, date))
    }
  }

  if (matchesWon === 50) news.push(newsUserMilestone(playerName, "alcanza 50 victorias en el circuito", date))
  if (matchesWon === 100) news.push(newsUserMilestone(playerName, "alcanza 100 victorias en su carrera", date))
  if (titles === 1) news.push(newsUserMilestone(playerName, "consigue su primer título profesional", date))
  if (titles === 5) news.push(newsUserMilestone(playerName, "suma 5 títulos en su carrera", date))
  if (titles === 10) news.push(newsUserMilestone(playerName, "alcanza los 10 títulos profesionales", date))

  return news
}
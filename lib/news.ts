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
  date: string,
  score?: string | null
): NewsItem {
  const scoreTxt = score ? ` por ${score}` : ""
  const bodies = [
    `${winner} se llevó el título en ${tournamentName} tras derrotar a ${finalist} en la final${scoreTxt}.`,
    `Victoria de ${winner} en ${tournamentName}. ${finalist} no pudo frenar al campeón${scoreTxt ? ` en la final${scoreTxt}` : ""}.`,
    `${winner} conquistó ${tournamentName} venciendo a ${finalist} en la final${scoreTxt}.`,
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

function milestoneItem(headline: string, body: string, date: string): NewsItem {
  return { id: makeId(), date, category: "user-milestone", emoji: "⭐", headline, body }
}

const RANK_MILESTONES = [100, 50, 30, 20, 10, 5, 3, 1]

/**
 * Hitos de ranking del usuario. Usa `bestRankBefore` (el mejor ranking histórico
 * ANTES de este resultado) para garantizar que cada umbral se anuncie una sola vez,
 * la primera vez que se alcanza — sin re-disparar si el ranking oscila.
 */
export function checkRankMilestones(
  playerName: string,
  currentRank: number,
  bestRankBefore: number,
  date: string
): NewsItem[] {
  const news: NewsItem[] = []
  for (const m of RANK_MILESTONES) {
    if (currentRank <= m && bestRankBefore > m) {
      if (m === 1) {
        news.push(milestoneItem(
          `${playerName} es el nuevo número 1 del mundo`,
          `${playerName} alcanza la cima del ranking mundial por primera vez. Un hito histórico en su carrera.`,
          date
        ))
      } else {
        news.push(milestoneItem(
          `${playerName} entra al top ${m}`,
          `${playerName} alcanza el top ${m} del ranking mundial por primera vez, ahora en el puesto #${currentRank}.`,
          date
        ))
      }
    }
  }
  return news
}

/** Hitos por cantidad de victorias en la carrera (se disparan al cruzar el umbral exacto). */
export function checkMatchMilestones(playerName: string, matchesWon: number, date: string): NewsItem[] {
  const news: NewsItem[] = []
  const marks = [50, 100, 250, 500]
  for (const m of marks) {
    if (matchesWon === m) {
      news.push(milestoneItem(
        `${playerName} llega a ${m} victorias`,
        `${playerName} suma ${m} victorias en el circuito profesional a lo largo de su carrera.`,
        date
      ))
    }
  }
  return news
}

const CATEGORY_TITLE_LABEL: Record<string, string> = {
  "grand-slam": "Grand Slam",
  "masters-1000": "Masters 1000",
  "atp-finals": "ATP Finals",
  "atp-500": "ATP 500",
  "atp-250": "ATP 250",
  "challenger": "Challenger",
  "futures": "Futures",
}

/** Categorías cuyo "primer título" merece una noticia propia además del primer título global. */
const BIG_TITLE_CATEGORIES = new Set(["grand-slam", "masters-1000", "atp-finals", "atp-500"])

/**
 * Hitos de títulos. `priorTotal` = títulos ganados antes de este; `priorSameCategory`
 * = títulos previos de esta misma categoría. Anuncia el primer título profesional y
 * el primero de cada categoría importante (primer M1000, primer Grand Slam, etc.).
 */
export function checkTitleMilestones(
  playerName: string,
  tournamentName: string,
  category: string,
  priorTotal: number,
  priorSameCategory: number,
  date: string
): NewsItem[] {
  const news: NewsItem[] = []
  const catLabel = CATEGORY_TITLE_LABEL[category] ?? category

  if (priorTotal === 0) {
    news.push(milestoneItem(
      `${playerName} gana su primer título profesional`,
      `${playerName} conquista ${tournamentName}, el primer título de su carrera profesional.`,
      date
    ))
  }
  if (priorSameCategory === 0 && BIG_TITLE_CATEGORIES.has(category)) {
    news.push(milestoneItem(
      `${playerName} gana su primer ${catLabel}`,
      `${playerName} levanta su primer trofeo de ${catLabel} tras ganar ${tournamentName}.`,
      date
    ))
  }
  return news
}

/**
 * Detecta movimientos destacados en el ranking de los rivales entre dos fotos del
 * ranking: nuevo número 1 del mundo y nuevos ingresos al top 5. Limita la cantidad
 * para evitar saturar la sección con oscilaciones semanales.
 */
export function computeRivalRankingNews(
  prev: { id: string; name: string; rank: number }[],
  next: { id: string; name: string; rank: number }[],
  date: string,
  excludeId = "USER"
): NewsItem[] {
  const prevRankById = new Map(prev.map(p => [p.id, p.rank]))
  const news: NewsItem[] = []

  for (const p of next) {
    if (p.id === excludeId) continue
    const before = prevRankById.get(p.id)
    if (before == null) continue

    if (p.rank === 1 && before > 1) {
      news.push({
        id: makeId(), date, category: "ranking-move", emoji: "📈",
        headline: `${p.name} es el nuevo número 1 del mundo`,
        body: `${p.name} destrona al anterior líder y se convierte en el nuevo número 1 del ranking mundial.`,
      })
    } else if (p.rank <= 5 && before > 5) {
      news.push({
        id: makeId(), date, category: "ranking-move", emoji: "📈",
        headline: `${p.name} es el nuevo número ${p.rank} del mundo`,
        body: `${p.name} sube hasta el puesto #${p.rank} del ranking mundial, entrando por primera vez en el top 5.`,
      })
    }
  }

  return news.slice(0, 3)
}

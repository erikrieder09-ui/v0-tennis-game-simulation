import { computeOverall } from "./attributes"
import { divisionForRank, getRankings } from "./rivals"
import type { AttributeSet, Division, PlayerProfile, Rival, Surface, Tour } from "./types"

/* -------------------------------------------------------------------------- */
/*  Career state                                                               */
/* -------------------------------------------------------------------------- */

export interface MatchRecord {
  id: string
  date: string
  tournament: string
  round: string
  opponent: string
  opponentRank: number
  scoreline: string
  won: boolean
  surface: Surface
}

export interface CareerState {
  player: PlayerProfile
  /** ranking points */
  points: number
  /** career-high best rank achieved */
  bestRank: number
  /** bank balance in USD */
  money: number
  /** ISO date string of the current week's Monday */
  date: string
  /** accumulated mentality experience (drives the attribute up over time) */
  mentalityXp: number
  /** how many times mental training has been done (diminishing returns) */
  mentalTrainings: number
  /** fitness 0-100; drops with matches, recovers with rest */
  fitness: number
  /** injury weeks remaining (0 = healthy) */
  injuryWeeksLeft: number
  injuryLabel: string | null
  titles: number
  matchesWon: number
  matchesLost: number
  history: MatchRecord[]
  log: string[]
}

const SEASON_START = "2026-06-08" // Monday, start of the grass swing

/** Points curve mirrored from rivals.ts so the player ranks coherently. */
function pointsForRank(rank: number): number {
  if (rank === 1) return 11000
  if (rank <= 5) return Math.round(8500 - (rank - 1) * 900)
  if (rank <= 10) return Math.round(5200 - (rank - 5) * 250)
  if (rank <= 50) return Math.round(3600 - (rank - 10) * 60)
  if (rank <= 100) return Math.round(1200 - (rank - 50) * 12)
  if (rank <= 175) return Math.round(620 - (rank - 100) * 4)
  return Math.max(8, Math.round(320 - (rank - 175) * 2))
}

export function createCareer(player: PlayerProfile): CareerState {
  // Start ranked somewhere between 200 and 250.
  const startRank = 200 + Math.floor(Math.random() * 51)
  const points = pointsForRank(startRank) + Math.floor(Math.random() * 15)
  return {
    player,
    points,
    bestRank: startRank,
    money: 12000,
    date: SEASON_START,
    mentalityXp: 0,
    mentalTrainings: 0,
    fitness: 100,
    injuryWeeksLeft: 0,
    injuryLabel: null,
    titles: 0,
    matchesWon: 0,
    matchesLost: 0,
    history: [],
    log: ["Arrancás tu carrera profesional. ¡A escalar el ranking!"],
  }
}

/* -------------------------------------------------------------------------- */
/*  Ranking with the player inserted by POINTS                                 */
/* -------------------------------------------------------------------------- */

export interface RankedPlayer extends Rival {
  isUser?: boolean
}

export function buildLiveRanking(tour: Tour, userPoints: number, player: PlayerProfile): RankedPlayer[] {
  const base = getRankings(tour)
  const userOverall = computeOverall(player.attributes, player.playStyle)
  const userRow: RankedPlayer = {
    id: "USER",
    tour,
    firstName: player.firstName,
    lastName: player.lastName,
    nationality: player.nationality,
    age: player.age,
    handedness: player.handedness,
    backhand: player.backhand,
    height: player.height,
    weight: player.weight,
    playStyle: player.playStyle,
    attributes: player.attributes,
    overall: userOverall,
    rank: 0,
    points: userPoints,
    favSurface: "hard",
    injuryProneness: 20,
    isUser: true,
  }
  // Exclude the deepest rival so the field size stays constant after insertion.
  const merged = [...base.slice(0, base.length - 1), userRow].sort(
    (a, b) => b.points - a.points || b.overall - a.overall,
  )
  merged.forEach((r, i) => {
    r.rank = i + 1
  })
  return merged
}

export function getPlayerRank(career: CareerState): number {
  const ranking = buildLiveRanking(career.player.tour, career.points, career.player)
  return ranking.find((r) => r.isUser)?.rank ?? 250
}

export function getPlayerDivision(career: CareerState): Division {
  return divisionForRank(getPlayerRank(career))
}

/* -------------------------------------------------------------------------- */
/*  Date helpers                                                               */
/* -------------------------------------------------------------------------- */

export function addWeeks(iso: string, weeks: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00")
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
}

export function formatMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US")
}

/* -------------------------------------------------------------------------- */
/*  Mentality: experience converts to the attribute with diminishing returns   */
/* -------------------------------------------------------------------------- */

/**
 * Applies accumulated mentality XP to the player's mentality attribute.
 * The higher the mentality, the more XP each extra point costs.
 */
export function applyMentalityXp(attrs: AttributeSet, xp: number): { attrs: AttributeSet; xpLeft: number; gained: number } {
  let mentality = attrs.mentality
  let pool = xp
  let gained = 0
  // Cost rises with current mentality (harder to improve an already-strong mind).
  while (mentality < 99) {
    const cost = Math.round(6 + Math.max(0, mentality - 55) * 0.5)
    if (pool < cost) break
    pool -= cost
    mentality += 1
    gained += 1
  }
  return { attrs: { ...attrs, mentality }, xpLeft: pool, gained }
}

/**
 * Mental training session: +1 max, with strongly diminishing returns the higher
 * the mentality already is, and capped so it can't be farmed without competing.
 */
export function trainMentality(attrs: AttributeSet, trainings: number): { value: number; gained: boolean; reason: string } {
  const m = attrs.mentality
  if (m >= 80) {
    return { value: m, gained: false, reason: "Tu mente ya está muy entrenada. Solo los partidos difíciles la subirán más." }
  }
  // Probability of a +1 falls as mentality and total trainings grow.
  const chance = Math.max(0.12, 0.85 - m * 0.008 - trainings * 0.02)
  if (Math.random() < chance) {
    return { value: m + 1, gained: true, reason: "Buena sesión de trabajo mental. +1 mentalidad." }
  }
  return { value: m, gained: false, reason: "Sesión de trabajo mental sin progreso visible. La mente se forja compitiendo." }
}

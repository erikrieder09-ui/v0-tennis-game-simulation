import { computeOverall } from "./attributes"
import { divisionForRank, getRankings } from "./rivals"
import type { AttributeSet, Division, PlayerProfile, Rival, Surface, Tour } from "./types"
 
/* -------------------------------------------------------------------------- */
/*  Rolling ranking system (ventana de 52 semanas)                             */
/* -------------------------------------------------------------------------- */
 
export interface PointsEntry {
  id: string
  points: number
  date: string   // ISO Monday en que se ganaron
  label: string  // nombre del torneo, para mostrar
}
 
const RANKING_WINDOW_WEEKS = 52
 
export function isWithinRankingWindow(entryDate: string, currentDate: string): boolean {
  const cutoff = addWeeks(currentDate, -RANKING_WINDOW_WEEKS)
  return entryDate >= cutoff
}
 
/** Suma solo los puntos cuya fecha está dentro de las últimas 52 semanas. */
export function recomputePoints(history: PointsEntry[], currentDate: string): number {
  return history
    .filter(e => isWithinRankingWindow(e.date, currentDate))
    .reduce((sum, e) => sum + e.points, 0)
}
 
/** Agrega una entrada nueva al historial de puntos. */
export function addPointsEntry(
  history: PointsEntry[],
  points: number,
  date: string,
  label: string
): PointsEntry[] {
  if (points === 0) return history
  return [
    ...history,
    { id: `${label}-${date}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, points, date, label },
  ]
}
 
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
  /** ranking points (total calculado, derivado de pointsHistory) */
  points: number
  /** historial de puntos con fecha — fuente de verdad para el ranking rolling */
  pointsHistory: PointsEntry[]
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
  /** fitness 0-100; drops with matches and training, recovers with rest or bottles */
  fitness: number
  /** injury weeks remaining (0 = healthy) */
  injuryWeeksLeft: number
  injuryLabel: string | null
  titles: number
  matchesWon: number
  matchesLost: number
  history: MatchRecord[]
  log: string[]
  busyPlayers: string[]
  /** resultado final guardado por torneo, para que no se regenere cada vez que se entra */
  tournamentResults: Record<string, any>
  /** historial de puntos extra ganados por rivales, con fecha — también rolling 52 semanas */
  rivalBonusHistory: Record<string, PointsEntry[]>
  /** sistema de progresión: nivel y XP del jugador */
  level: number
  xp: number
  /** puntos de atributo ya gastados (para calcular los disponibles: ver availableAttributePoints) */
  spentAttributePoints: number
  /** bonus de tope por atributo, ganado al ganar M1000/GS/Finals */
  capBreakers: Partial<Record<import("./progression").VisibleKey, number>>

  /** última fecha en que se aplicó progresión anual (para no duplicar ni saltear) */
  lastProgressionDate: string
  /** palmarés de rivales: rivalId → lista de nombres de torneos ganados */
  rivalPalmares: Record<string, string[]>
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
  const startRank = 230 + Math.floor(Math.random() * 21)
  const startPoints = pointsForRank(startRank) + Math.floor(Math.random() * 15)
  const initialEntry: PointsEntry = {
    id: "initial-ranking",
    points: startPoints,
    date: SEASON_START,
    label: "Ranking inicial",
  }
  return {
    player,
    points: startPoints,
    pointsHistory: [initialEntry],
    bestRank: startRank,
    money: 3000,
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
    busyPlayers: [],
    tournamentResults: {},
    rivalBonusHistory: {},
    level: 1,
    xp: 0,
    spentAttributePoints: -5, // negativo = puntos de regalo extra sumados a los del nivel
    capBreakers: {},
    lastProgressionDate: SEASON_START,
    rivalPalmares: {},
  }
}
 
/* -------------------------------------------------------------------------- */
/*  Ranking with the player inserted by POINTS                                 */
/* -------------------------------------------------------------------------- */
 
export interface RankedPlayer extends Rival {
  isUser?: boolean
}
 
export function buildLiveRanking(
  tour: Tour,
  userPoints: number,
  player: PlayerProfile,
  rivalBonusHistory: Record<string, PointsEntry[]> = {},
  currentDate: string = SEASON_START
): RankedPlayer[] {
  const base = getRankings(tour, currentDate)
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
    currentAbility: userOverall,
    potentialAbility: userOverall + 5,
    isUser: true,
    retirementDate: null,
  }
  // Exclude the deepest rival so the field size stays constant after insertion.
  const withBonus = base.slice(0, base.length - 1).map(r => {
    // El historial real de cada rival incluye su valor base inicial (que también vence
    // a las 52 semanas, igual que cualquier otro torneo) más los torneos que ganó/jugó.
    const ownedHistory = rivalBonusHistory[r.id] ?? []
    const fullHistory: PointsEntry[] = [
      { id: `${r.id}-base`, points: r.points, date: SEASON_START, label: "Ranking inicial" },
      ...ownedHistory,
    ]
    const points = recomputePoints(fullHistory, currentDate)
    return { ...r, points }
  })
  const merged = [...withBonus, userRow].sort(
    (a, b) => b.points - a.points || b.overall - a.overall,
  )
  merged.forEach((r, i) => {
    r.rank = i + 1
  })
  return merged
}
 
export function getPlayerRank(career: CareerState): number {
  const ranking = buildLiveRanking(career.player.tour, career.points, career.player, career.rivalBonusHistory, career.date)
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
 
export function applyMentalityXp(attrs: AttributeSet, xp: number): { attrs: AttributeSet; xpLeft: number; gained: number } {
  let mentality = attrs.mentality
  let pool = xp
  let gained = 0
  while (mentality < 99) {
    const cost = Math.round(6 + Math.max(0, mentality - 55) * 0.5)
    if (pool < cost) break
    pool -= cost
    mentality += 1
    gained += 1
  }
  return { attrs: { ...attrs, mentality }, xpLeft: pool, gained }
}
 
export function trainMentality(attrs: AttributeSet, trainings: number): { value: number; gained: boolean; reason: string } {
  const m = attrs.mentality
  if (m >= 80) {
    return { value: m, gained: false, reason: "Tu mente ya está muy entrenada. Solo los partidos difíciles la subirán más." }
  }
  const chance = Math.max(0.12, 0.85 - m * 0.008 - trainings * 0.02)
  if (Math.random() < chance) {
    return { value: m + 1, gained: true, reason: "Buena sesión de trabajo mental. +1 mentalidad." }
  }
  return { value: m, gained: false, reason: "Sesión de trabajo mental sin progreso visible. La mente se forja compitiendo." }
}
 
/* -------------------------------------------------------------------------- */
/*  Ageing & progression — llamar una vez por temporada (cada ~52 semanas)    */
/* -------------------------------------------------------------------------- */
 
function progressionRate(age: number): number {
  if (age <= 18) return 4.0
  if (age <= 20) return 3.0
  if (age <= 22) return 2.0
  if (age <= 24) return 1.2
  if (age <= 26) return 0.6
  if (age <= 28) return 0.2
  if (age <= 30) return 0.0
  if (age <= 33) return -0.5
  if (age <= 36) return -1.2
  return -2.0
}
const PHYSICAL_ATTRS: (keyof AttributeSet)[] = ["speed", "stamina", "power"]
const TECHNICAL_ATTRS: (keyof AttributeSet)[] = ["serve", "drive", "backhand", "volley"]
 
export function applyAnnualProgression(career: CareerState): {
  career: CareerState
  changes: Partial<Record<keyof AttributeSet, number>>
  summary: string
} {
  const age = career.player.age
  const attrs = { ...career.player.attributes }
  const changes: Partial<Record<keyof AttributeSet, number>> = {}
 
  const rate = progressionRate(age)
 
  const estimatedPA = age <= 20 ? 90
    : age <= 23 ? 85
    : age <= 26 ? 80
    : age <= 29 ? 75
    : 65
 
  const currentOverall = computeOverall(attrs, career.player.playStyle)
  const roomToGrow = Math.max(0, estimatedPA - currentOverall)
 
  if (age <= 30) {
    for (const key of TECHNICAL_ATTRS) {
      const gain = Math.round((rate * (roomToGrow / 20)) * (0.8 + Math.random() * 0.4))
      if (gain !== 0) {
        attrs[key] = Math.min(99, Math.max(30, attrs[key] ?? 0 + gain))
        if (gain !== 0) changes[key] = gain
      }
    }
    for (const key of PHYSICAL_ATTRS) {
      const physRate = age <= 26 ? rate * 0.7 : age <= 28 ? -0.2 : -0.5
      const gain = Math.round(physRate * (0.8 + Math.random() * 0.4))
      if (gain !== 0) {
        attrs[key] = Math.min(99, Math.max(30, attrs[key] ?? 0 + gain))
        changes[key] = gain
      }
    }
  } else {
    for (const key of PHYSICAL_ATTRS) {
      const loss = Math.round(Math.abs(rate) * (0.9 + Math.random() * 0.3))
      attrs[key] = Math.max(30, attrs[key] ?? 0 - loss)
      changes[key] = -loss
    }
    for (const key of TECHNICAL_ATTRS) {
      const techRate = age <= 33 ? 0.2 : age <= 36 ? 0.6 : 1.0
      const loss = Math.random() < techRate ? 1 : 0
      if (loss > 0) {
        attrs[key] = Math.max(30, attrs[key] ?? 0 - loss)
        changes[key] = -loss
      }
    }
  }
 
  if (age <= 35 && attrs.mentality < 95) {
    const mentalGain = age <= 25 ? 1 : age <= 30 ? 1 : age <= 35 ? 0 : -1
    if (Math.random() < 0.7 && mentalGain > 0) {
      attrs.mentality = Math.min(99, attrs.mentality + mentalGain)
      changes.mentality = mentalGain
    }
  }
 
  const newPlayer = {
    ...career.player,
    age: age + 1,
    attributes: attrs,
  }
 
  const gained = Object.entries(changes)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k} +${v}`)
    .join(", ")
  const lost = Object.entries(changes)
    .filter(([, v]) => v < 0)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ")
 
  const summary = age <= 26
    ? `Temporada completada (${age}→${age + 1} años). Progresión: ${gained || "sin cambios"}.`
    : age <= 30
    ? `Temporada completada (${age}→${age + 1} años). Meseta: ${gained || ""}${lost ? ` | Físico: ${lost}` : ""}.`
    : `Temporada completada (${age}→${age + 1} años). Declive físico: ${lost}${gained ? ` | Ganado: ${gained}` : ""}.`
 
  return {
    career: {
      ...career,
      player: newPlayer,
      log: [...career.log, summary],
    },
    changes,
    summary,
  }
}
 
export function checkAnnualProgression(career: CareerState): CareerState {
  const weeksSinceLastProgression = Math.round(
    (new Date(career.date).getTime() - new Date(career.lastProgressionDate).getTime())
    / (7 * 24 * 60 * 60 * 1000)
  )
  if (weeksSinceLastProgression >= 52) {
    const { career: updated } = applyAnnualProgression(career)
    return { ...updated, lastProgressionDate: career.date }
  }
  return career
}
import type { Division, Surface, Tour } from "./types"

/* -------------------------------------------------------------------------- */
/*  Tournament categories                                                      */
/* -------------------------------------------------------------------------- */

export type Category = "grand-slam" | "masters-1000" | "atp-500" | "atp-250" | "challenger" | "futures" | "atp-finals"

export interface CategoryInfo {
  label: string
  /** champion ranking points */
  winnerPoints: number
  /** total prize money pool reference (winner take) in USD */
  winnerPrize: number
  /** draw size (main draw) */
  drawSize: number
  /** number of best-of sets — GS men are best-of-5 */
  bestOf: 3 | 5
  /** does this event have a qualifying draw the user (if low-ranked) must play? */
  hasQualy: boolean
  /** entry rank cutoff: ranks better (lower) than this get direct main-draw entry */
  directEntryRank: number
  /** rank needed to even enter qualy */
  qualyEntryRank: number
}

export const CATEGORY_INFO: Record<Category, CategoryInfo> = {
  "grand-slam": { label: "Grand Slam", winnerPoints: 2000, winnerPrize: 2800000, drawSize: 128, bestOf: 5, hasQualy: true, directEntryRank: 104, qualyEntryRank: 250 },
  "masters-1000": { label: "Masters 1000", winnerPoints: 1000, winnerPrize: 1100000, drawSize: 64, bestOf: 3, hasQualy: true, directEntryRank: 60, qualyEntryRank: 250 },
  "atp-500": { label: "ATP/WTA 500", winnerPoints: 500, winnerPrize: 520000, drawSize: 32, bestOf: 3, hasQualy: true, directEntryRank: 50, qualyEntryRank: 180 },
  "atp-250": { label: "ATP/WTA 250", winnerPoints: 250, winnerPrize: 110000, drawSize: 32, bestOf: 3, hasQualy: true, directEntryRank: 80, qualyEntryRank: 250 },
  challenger: { label: "Challenger", winnerPoints: 100, winnerPrize: 22000, drawSize: 32, bestOf: 3, hasQualy: true, directEntryRank: 230, qualyEntryRank: 700 },
  futures: { label: "Futures (ITF)", winnerPoints: 35, winnerPrize: 4000, drawSize: 32, bestOf: 3, hasQualy: false, directEntryRank: 1500, qualyEntryRank: 2000 },
  "atp-finals": { label: "ATP Finals", winnerPoints: 1500, winnerPrize: 4800000, hasQualy: false, directEntryRank: 8, qualyEntryRank: 0, drawSize: 8, bestOf: 3},
}

export interface Tournament {
  id: string
  name: string
  city: string
  country: string
  category: Category
  surface: Surface
  /** ISO Monday the tournament week starts */
  date: string
  /** entry fee for low-tier events that require self-funding */
  entryFee: number
  season: number
}

/* -------------------------------------------------------------------------- */
/*  Calendar — starts June 2026 (grass swing) and runs through the season      */
/* -------------------------------------------------------------------------- */

// Each entry: weeks offset from 2026-06-08 (season start Monday)
interface CalSeed {
  wk: number
  name: string
  city: string
  country: string
  category: Category
  surface: Surface
  fee?: number
}

const CALENDAR_SEED: CalSeed[] = [
  // Grass swing
  { wk: 0, name: "Challenger de Surbiton", city: "Londres", country: "GBR", category: "challenger", surface: "grass", fee: 0 },
  { wk: 0, name: "Futures de Roma F3", city: "Roma", country: "ITA", category: "futures", surface: "clay", fee: 250 },

  { wk: 1, name: "ATP/WTA 250 de Stuttgart", city: "Stuttgart", country: "GER", category: "atp-250", surface: "grass" },
  { wk: 1, name: "Challenger de Nottingham", city: "Nottingham", country: "GBR", category: "challenger", surface: "grass", fee: 0 },

  { wk: 2, name: "ATP/WTA 500 de Halle", city: "Halle", country: "GER", category: "atp-500", surface: "grass" },
  { wk: 2, name: "ATP/WTA 500 del Queen's", city: "Londres", country: "GBR", category: "atp-500", surface: "grass" },

  { wk: 3, name: "ATP/WTA 250 de Mallorca", city: "Mallorca", country: "ESP", category: "atp-250", surface: "grass" },
  { wk: 3, name: "ATP/WTA 250 de Eastbourne", city: "Eastbourne", country: "GBR", category: "atp-250", surface: "grass" },

  { wk: 4, name: "Wimbledon", city: "Londres", country: "GBR", category: "grand-slam", surface: "grass" },

  { wk: 6, name: "Futures de Tampere F1", city: "Tampere", country: "FIN", category: "futures", surface: "clay", fee: 250 },
  { wk: 6, name: "ATP/WTA 250 de Bastad", city: "Bastad", country: "SWE", category: "atp-250", surface: "clay" },

  { wk: 7, name: "ATP/WTA 500 de Hamburgo", city: "Hamburgo", country: "GER", category: "atp-500", surface: "clay" },
  { wk: 7, name: "Challenger de San Marino", city: "San Marino", country: "ITA", category: "challenger", surface: "clay", fee: 0 },

  { wk: 8, name: "ATP/WTA 250 de Umag", city: "Umag", country: "CRO", category: "atp-250", surface: "clay" },

  // North American hard swing
  { wk: 9, name: "Masters 1000 de Canadá", city: "Toronto", country: "CAN", category: "masters-1000", surface: "hard" },

  { wk: 10, name: "Masters 1000 de Cincinnati", city: "Cincinnati", country: "USA", category: "masters-1000", surface: "hard" },

  { wk: 11, name: "ATP/WTA 250 de Winston-Salem", city: "Winston-Salem", country: "USA", category: "atp-250", surface: "hard" },
  { wk: 11, name: "Challenger de Cary", city: "Cary", country: "USA", category: "challenger", surface: "hard", fee: 0 },

  { wk: 12, name: "US Open", city: "Nueva York", country: "USA", category: "grand-slam", surface: "hard" },

  // Asian swing
  { wk: 14, name: "Challenger de Cassis", city: "Cassis", country: "FRA", category: "challenger", surface: "hard", fee: 0 },

  { wk: 15, name: "ATP/WTA 250 de Chengdu", city: "Chengdu", country: "CHN", category: "atp-250", surface: "hard" },

  { wk: 16, name: "ATP/WTA 500 de Pekín", city: "Pekín", country: "CHN", category: "atp-500", surface: "hard" },

  { wk: 17, name: "Masters 1000 de Shanghái", city: "Shanghái", country: "CHN", category: "masters-1000", surface: "hard" },

  { wk: 18, name: "Futures de El Cairo F12", city: "El Cairo", country: "EGY", category: "futures", surface: "clay", fee: 250 },

  // Indoor swing
  { wk: 19, name: "ATP/WTA 500 de Viena", city: "Viena", country: "AUT", category: "atp-500", surface: "hard" },

  { wk: 20, name: "Masters 1000 de París", city: "París", country: "FRA", category: "masters-1000", surface: "hard" },

  { wk: 21, name: "Challenger de Bratislava", city: "Bratislava", country: "SVK", category: "challenger", surface: "hard", fee: 0 },

  { wk: 22, name: "ATP Finals", city: "Turín", country: "ITA", category: "atp-finals", surface: "hard" },
// ============ TEMPORADA 2027 ============

  // Oceania swing (enero)
  { wk: 31, name: "ATP/WTA 250 de Auckland", city: "Auckland", country: "NZL", category: "atp-250", surface: "hard" },
  { wk: 31, name: "ATP/WTA 250 de Brisbane", city: "Brisbane", country: "AUS", category: "atp-250", surface: "hard" },

  { wk: 32, name: "ATP/WTA 250 de Adelaida", city: "Adelaida", country: "AUS", category: "atp-250", surface: "hard" },
  { wk: 32, name: "Challenger de Canberra", city: "Canberra", country: "AUS", category: "challenger", surface: "hard", fee: 0 },

  { wk: 33, name: "Australian Open", city: "Melbourne", country: "AUS", category: "grand-slam", surface: "hard" },

  // Post-Australian swing
  { wk: 35, name: "ATP/WTA 250 de Montpellier", city: "Montpellier", country: "FRA", category: "atp-250", surface: "hard" },
  { wk: 35, name: "ATP/WTA 250 de Cordoba", city: "Córdoba", country: "ARG", category: "atp-250", surface: "clay" },

  { wk: 36, name: "ATP/WTA 500 de Rotterdam", city: "Róterdam", country: "NED", category: "atp-500", surface: "hard" },
  { wk: 36, name: "ATP/WTA 250 de Buenos Aires", city: "Buenos Aires", country: "ARG", category: "atp-250", surface: "clay" },
  { wk: 36, name: "Challenger de Cherburgo", city: "Cherburgo", country: "FRA", category: "challenger", surface: "hard", fee: 0 },

  { wk: 37, name: "ATP/WTA 500 de Río de Janeiro", city: "Río de Janeiro", country: "BRA", category: "atp-500", surface: "clay" },
  { wk: 37, name: "ATP/WTA 250 de Marsella", city: "Marsella", country: "FRA", category: "atp-250", surface: "hard" },
  { wk: 37, name: "Futures de Antalya F2", city: "Antalya", country: "TUR", category: "futures", surface: "clay", fee: 250 },

  { wk: 38, name: "ATP/WTA 500 de Acapulco", city: "Acapulco", country: "MEX", category: "atp-500", surface: "hard" },
  { wk: 38, name: "ATP/WTA 250 de Dubái", city: "Dubái", country: "UAE", category: "atp-250", surface: "hard" },
  { wk: 38, name: "Challenger de Quimper", city: "Quimper", country: "FRA", category: "challenger", surface: "hard", fee: 0 },

  // Sunshine Double
  { wk: 39, name: "Masters 1000 de Indian Wells", city: "Indian Wells", country: "USA", category: "masters-1000", surface: "hard" },

  { wk: 41, name: "Masters 1000 de Miami", city: "Miami", country: "USA", category: "masters-1000", surface: "hard" },

  // Clay swing americano + Challengers
  { wk: 43, name: "ATP/WTA 250 de Houston", city: "Houston", country: "USA", category: "atp-250", surface: "clay" },
  { wk: 43, name: "ATP/WTA 250 de Marrakech", city: "Marrakech", country: "MAR", category: "atp-250", surface: "clay" },
  { wk: 43, name: "Challenger de Sarasota", city: "Sarasota", country: "USA", category: "challenger", surface: "clay", fee: 0 },

  // Clay swing europeo
  { wk: 44, name: "Masters 1000 de Montecarlo", city: "Montecarlo", country: "MON", category: "masters-1000", surface: "clay" },

  { wk: 45, name: "ATP/WTA 250 de Barcelona", city: "Barcelona", country: "ESP", category: "atp-250", surface: "clay" },
  { wk: 45, name: "Challenger de Bucarest", city: "Bucarest", country: "ROU", category: "challenger", surface: "clay", fee: 0 },

  { wk: 46, name: "Masters 1000 de Madrid", city: "Madrid", country: "ESP", category: "masters-1000", surface: "clay" },

  { wk: 48, name: "Masters 1000 de Roma", city: "Roma", country: "ITA", category: "masters-1000", surface: "clay" },

  { wk: 50, name: "ATP/WTA 250 de Ginebra", city: "Ginebra", country: "SUI", category: "atp-250", surface: "clay" },
  { wk: 50, name: "ATP/WTA 250 de Lyon", city: "Lyon", country: "FRA", category: "atp-250", surface: "clay" },

  { wk: 51, name: "Roland Garros", city: "París", country: "FRA", category: "grand-slam", surface: "clay" },

  // Grass swing 2027
  { wk: 53, name: "Challenger de Surbiton", city: "Londres", country: "GBR", category: "challenger", surface: "grass", fee: 0 },
  { wk: 53, name: "Futures de Roma F3", city: "Roma", country: "ITA", category: "futures", surface: "clay", fee: 250 },

  { wk: 54, name: "ATP/WTA 250 de Stuttgart", city: "Stuttgart", country: "GER", category: "atp-250", surface: "grass" },
  { wk: 54, name: "Challenger de Nottingham", city: "Nottingham", country: "GBR", category: "challenger", surface: "grass", fee: 0 },

  { wk: 55, name: "ATP/WTA 500 de Halle", city: "Halle", country: "GER", category: "atp-500", surface: "grass" },
  { wk: 55, name: "ATP/WTA 500 del Queen's", city: "Londres", country: "GBR", category: "atp-500", surface: "grass" },

  { wk: 56, name: "ATP/WTA 250 de Mallorca", city: "Mallorca", country: "ESP", category: "atp-250", surface: "grass" },
  { wk: 56, name: "ATP/WTA 250 de Eastbourne", city: "Eastbourne", country: "GBR", category: "atp-250", surface: "grass" },

  { wk: 57, name: "Wimbledon", city: "Londres", country: "GBR", category: "grand-slam", surface: "grass" },

  // Swing americano hard 2027
  { wk: 59, name: "Futures de Tampere F1", city: "Tampere", country: "FIN", category: "futures", surface: "clay", fee: 250 },
  { wk: 59, name: "ATP/WTA 250 de Bastad", city: "Bastad", country: "SWE", category: "atp-250", surface: "clay" },

  { wk: 60, name: "ATP/WTA 500 de Hamburgo", city: "Hamburgo", country: "GER", category: "atp-500", surface: "clay" },
  { wk: 60, name: "Challenger de San Marino", city: "San Marino", country: "ITA", category: "challenger", surface: "clay", fee: 0 },

  { wk: 61, name: "ATP/WTA 250 de Umag", city: "Umag", country: "CRO", category: "atp-250", surface: "clay" },

  { wk: 62, name: "Masters 1000 de Canadá", city: "Toronto", country: "CAN", category: "masters-1000", surface: "hard" },

  { wk: 63, name: "Masters 1000 de Cincinnati", city: "Cincinnati", country: "USA", category: "masters-1000", surface: "hard" },

  { wk: 64, name: "ATP/WTA 250 de Winston-Salem", city: "Winston-Salem", country: "USA", category: "atp-250", surface: "hard" },
  { wk: 64, name: "Challenger de Cary", city: "Cary", country: "USA", category: "challenger", surface: "hard", fee: 0 },

  { wk: 65, name: "US Open", city: "Nueva York", country: "USA", category: "grand-slam", surface: "hard" },

  // Asian swing 2027
  { wk: 67, name: "Challenger de Cassis", city: "Cassis", country: "FRA", category: "challenger", surface: "hard", fee: 0 },

  { wk: 68, name: "ATP/WTA 250 de Chengdu", city: "Chengdu", country: "CHN", category: "atp-250", surface: "hard" },

  { wk: 69, name: "ATP/WTA 500 de Pekín", city: "Pekín", country: "CHN", category: "atp-500", surface: "hard" },

  { wk: 70, name: "Masters 1000 de Shanghái", city: "Shanghái", country: "CHN", category: "masters-1000", surface: "hard" },

  { wk: 71, name: "Futures de El Cairo F12", city: "El Cairo", country: "EGY", category: "futures", surface: "clay", fee: 250 },

  // Indoor swing 2027
  { wk: 72, name: "ATP/WTA 500 de Viena", city: "Viena", country: "AUT", category: "atp-500", surface: "hard" },

  { wk: 73, name: "Masters 1000 de París", city: "París", country: "FRA", category: "masters-1000", surface: "hard" },

  { wk: 74, name: "Challenger de Bratislava", city: "Bratislava", country: "SVK", category: "challenger", surface: "hard", fee: 0 },

  { wk: 75, name: "ATP Finals", city: "Turín", country: "ITA", category: "atp-finals", surface: "hard" },
]

const SEASON_START = "2026-06-08"

function addWeeks(iso: string, weeks: number): string {
  const d = new Date(iso + "T00:00:00")
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

const CYCLE_START_WK = 31  // semana donde arranca el patrón anual repetible (Oceania swing)
const CYCLE_LENGTH = 52    // duración de un año calendario en semanas
const CYCLES_TO_GENERATE = 24 // cuántos años repetir hacia adelante (~6 años de carrera jugable)

let _calendar: Tournament[] | null = null

export function getCalendar(): Tournament[] {
  if (_calendar) return _calendar

  const entries: Tournament[] = CALENDAR_SEED.map((s, i) => ({
  id: `T${i}`,
  name: s.name,
  city: s.city,
  country: s.country,
  category: s.category,
  surface: s.surface,
  date: addWeeks(SEASON_START, s.wk),
  entryFee: s.fee ?? 0,
  season: s.wk < CYCLE_START_WK ? 2026 : 2027,  // ← semanas 0-30 son 2026, 31+ son 2027
}))

  // Repetimos el patrón anual (desde CYCLE_START_WK) para años futuros
  const cyclePattern = CALENDAR_SEED.filter(s => s.wk >= CYCLE_START_WK)

  for (let cycle = 1; cycle <= CYCLES_TO_GENERATE; cycle++) {
  cyclePattern.forEach((s, i) => {
    const wk = s.wk + cycle * CYCLE_LENGTH
    entries.push({
      id: `T-cycle${cycle}-${i}`,
      name: s.name,
      city: s.city,
      country: s.country,
      category: s.category,
      surface: s.surface,
      date: addWeeks(SEASON_START, wk),
      entryFee: s.fee ?? 0,
      season: 2027 + cycle,  // ← 2028, 2029, 2030...
    })
  })
}

  _calendar = entries
  return _calendar
}

/** Tournaments happening on or after the given date, sorted chronologically. */
export function upcomingTournaments(fromDate: string): Tournament[] {
  return getCalendar()
    .filter((t) => t.date >= fromDate)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export type EntryStatus =
  | { kind: "direct"; label: string }
  | { kind: "qualy"; label: string; rounds: number }
  | { kind: "ineligible"; label: string }

export function entryStatus(category: Category, rank: number): EntryStatus {
  const info = CATEGORY_INFO[category]
  const qualyEligible =
    category === "grand-slam" || category === "masters-1000"

  if (rank <= info.directEntryRank) {
    return {
      kind: "direct",
      label: "Entrada directa al cuadro principal",
    }
  }

  if (
    qualyEligible &&
    info.hasQualy &&
    rank <= info.qualyEntryRank
  ) {
    const rounds = category === "grand-slam" ? 3 : 2

    return {
      kind: "qualy",
      label: `Debés jugar ${rounds} rondas de clasificación (qualy)`,
      rounds,
    }
  }

  if (rank <= info.qualyEntryRank) {
    return {
      kind: "direct",
      label: "Entrada directa al cuadro principal",
    }
  }

  return {
    kind: "ineligible",
    label: "Tu ranking es demasiado alto/bajo para inscribirte",
  }
}


export function divisionForCategory(category: Category): Division {
  switch (category) {
    case "grand-slam":
      return "grand-slam"
    case "masters-1000":
      return "masters"
    case "atp-500":
    case "atp-250":
      return "tour"
    case "challenger":
      return "challenger"
    case "futures":
      return "futures"
    case "atp-finals":
      return "masters"
  }
}

export function roundsForDraw(drawSize: number): string[] {
  const map: Record<number, string[]> = {
    128: ["1ª ronda", "2ª ronda", "3ª ronda", "4ª ronda", "Cuartos", "Semifinal", "Final"],
    64: ["1ª ronda", "2ª ronda", "3ª ronda", "Cuartos", "Semifinal", "Final"],
    32: ["1ª ronda", "2ª ronda", "Cuartos", "Semifinal", "Final"],
    28: ["1ª ronda", "2ª ronda", "Cuartos", "Semifinal", "Final"],
    8: ["Round Robin", "Semifinal", "Final"],
  }
  return map[drawSize] ?? ["1ª ronda", "2ª ronda", "Cuartos", "Semifinal", "Final"]
}

/** Points awarded for reaching a given round index (0-based) of the main draw. */
export function pointsForResult(category: Category, roundsTotal: number, roundsReached: number): number {
  const winner = CATEGORY_INFO[category].winnerPoints
  // Geometric-ish distribution: each round roughly doubles toward the title.
  const frac = Math.pow(0.55, roundsTotal - roundsReached)
  return Math.round(winner * frac)
}

/** Prize money for reaching a given round index (0-based). */
export function prizeForResult(category: Category, roundsTotal: number, roundsReached: number): number {
  const winner = CATEGORY_INFO[category].winnerPrize
  const frac = Math.pow(0.58, roundsTotal - roundsReached)
  return Math.round(winner * frac)
} 

/** Devuelve true si entre dos torneos hay un cambio de temporada */
export function isSeasonTransition(a: Tournament, b: Tournament): boolean {
  return a.season !== b.season
}

/** Semanas de off-season entre el ATP Finals y el inicio de la nueva temporada */
export function isOffSeason(date: string): boolean {
  const cal = getCalendar()
  const prev = cal.filter(t => t.date <= date).at(-1)
  const next = cal.find(t => t.date > date)
  if (!prev || !next) return false
  return prev.season !== next.season
}



// lib/tournaments.ts
// Torneos de la swing de césped de junio — datos oficiales ATP

import type { Rival, Surface, Tour } from "./types"

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export type TournamentCategory = "grand-slam" | "atp500" | "atp250" | "challenger125"

export interface TournamentDef {
  id: string
  name: string
  shortName: string
  flag: string
  city: string
  country: string
  surface: Surface
  category: TournamentCategory
  drawSize: number          // cuadro principal
  qualifyingSize: number    // 0 = sin qualifying
  qualifyingDrawSize: number// jugadores en qualifying (0 si no hay)
  bestOf: 3 | 5
  finalSetTiebreak: boolean // tiebreak en set decisivo
  finalSetTiebreakAt: number// a cuántos (7 = tiebreak normal, 10 = super-tiebreak)
  weekStart: string         // ISO date lunes de inicio
  rankingPoints: Record<string, number> // ronda → puntos
  minRankToEnterDirect: number // ranking máximo para entrada directa
  entryFee: number          // USD
  totalPrizeMoney: number   // USD
  prizePerRound: Record<string, number>
}

/* -------------------------------------------------------------------------- */
/*  Puntos de ranking oficiales por ronda                                      */
/* -------------------------------------------------------------------------- */

const POINTS = {
  "grand-slam": { W: 2000, F: 1200, SF: 720, QF: 360, R16: 180, R32: 90, R64: 45, R128: 10, Q2: 40, Q1: 25 },
  atp500:        { W: 500,  F: 300,  SF: 180, QF: 90,  R16: 45,  R32: 20 },
  atp250:        { W: 250,  F: 150,  SF: 90,  QF: 45,  R16: 20,  R32: 5  },
  challenger125: { W: 125,  F: 75,   SF: 45,  QF: 25,  R16: 10,  R32: 5,  Q2: 10, Q1: 5 },
}

/* -------------------------------------------------------------------------- */
/*  Prize money por ronda (aproximado real)                                    */
/* -------------------------------------------------------------------------- */

const PRIZE = {
  "grand-slam": { W: 2700000, F: 1350000, SF: 675000, QF: 337500, R16: 168000, R32: 84000, R64: 42000, R128: 21000, Q2: 15000, Q1: 10000 },
  atp500:        { W: 266000,  F: 133000,  SF: 66500,  QF: 33000,  R16: 16500,  R32: 8500  },
  atp250:        { W: 133000,  F: 66500,   SF: 33000,  QF: 16500,  R16: 8500,   R32: 4500  },
  challenger125: { W: 26000,   F: 15000,   SF: 8500,   QF: 4500,   R16: 2500,   R32: 1000, Q2: 800, Q1: 400 },
}

/* -------------------------------------------------------------------------- */
/*  Definiciones de torneos — swing de césped junio 2026                       */
/* -------------------------------------------------------------------------- */

export const JUNE_GRASS_TOURNAMENTS: TournamentDef[] = [
  {
    id: "surbiton-2026",
    name: "Surbiton Trophy",
    shortName: "Surbiton",
    flag: "🇬🇧",
    city: "Surbiton",
    country: "GBR",
    surface: "grass",
    category: "challenger125",
    drawSize: 32,
    qualifyingSize: 4,
    qualifyingDrawSize: 16,
    bestOf: 3,
    finalSetTiebreak: true,
    finalSetTiebreakAt: 10,
    weekStart: "2026-06-08",
    rankingPoints: POINTS.challenger125,
    minRankToEnterDirect: 175,
    entryFee: 200,
    totalPrizeMoney: 132680,
    prizePerRound: PRIZE.challenger125,
  },
  {
    id: "stuttgart-2026",
    name: "Boss Open Stuttgart",
    shortName: "Stuttgart",
    flag: "🇩🇪",
    city: "Stuttgart",
    country: "GER",
    surface: "grass",
    category: "atp250",
    drawSize: 32,
    qualifyingSize: 0,
    qualifyingDrawSize: 0,
    bestOf: 3,
    finalSetTiebreak: true,
    finalSetTiebreakAt: 10,
    weekStart: "2026-06-08",
    rankingPoints: POINTS.atp250,
    minRankToEnterDirect: 80,
    entryFee: 0,
    totalPrizeMoney: 703600,
    prizePerRound: PRIZE.atp250,
  },
  {
    id: "queens-2026",
    name: "cinch Championships",
    shortName: "Queen's",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    city: "London",
    country: "GBR",
    surface: "grass",
    category: "atp500",
    drawSize: 48,
    qualifyingSize: 0,
    qualifyingDrawSize: 0,
    bestOf: 3,
    finalSetTiebreak: true,
    finalSetTiebreakAt: 10,
    weekStart: "2026-06-15",
    rankingPoints: POINTS.atp500,
    minRankToEnterDirect: 50,
    entryFee: 0,
    totalPrizeMoney: 2083790,
    prizePerRound: PRIZE.atp500,
  },
  {
    id: "halle-2026",
    name: "Terra Wortmann Open",
    shortName: "Halle",
    flag: "🇩🇪",
    city: "Halle",
    country: "GER",
    surface: "grass",
    category: "atp500",
    drawSize: 32,
    qualifyingSize: 0,
    qualifyingDrawSize: 0,
    bestOf: 3,
    finalSetTiebreak: true,
    finalSetTiebreakAt: 10,
    weekStart: "2026-06-15",
    rankingPoints: POINTS.atp500,
    minRankToEnterDirect: 60,
    entryFee: 0,
    totalPrizeMoney: 2083790,
    prizePerRound: PRIZE.atp500,
  },
  {
    id: "wimbledon-2026",
    name: "The Championships, Wimbledon",
    shortName: "Wimbledon",
    flag: "🇬🇧",
    city: "London",
    country: "GBR",
    surface: "grass",
    category: "grand-slam",
    drawSize: 128,
    qualifyingSize: 16,
    qualifyingDrawSize: 128,
    bestOf: 5,
    finalSetTiebreak: true,
    finalSetTiebreakAt: 7,
    weekStart: "2026-06-29",
    rankingPoints: POINTS["grand-slam"],
    minRankToEnterDirect: 100,
    entryFee: 0,
    totalPrizeMoney: 50000000,
    prizePerRound: PRIZE["grand-slam"],
  },
]

/* -------------------------------------------------------------------------- */
/*  Draw types                                                                 */
/* -------------------------------------------------------------------------- */

export type MatchStatus = "scheduled" | "in-progress" | "completed"

export interface DrawMatch {
  id: string
  round: string
  position: number        // posición en el cuadro (0-indexed dentro de la ronda)
  player1: Rival | null
  player2: Rival | null
  winner: Rival | null
  score: string | null    // "6-4 7-5" etc
  isUserMatch: boolean
  status: MatchStatus
}

export interface TournamentDraw {
  tournamentId: string
  rounds: string[]        // ["R128","R64","R32","R16","QF","SF","F"]
  matches: DrawMatch[]
  qualifyingMatches: DrawMatch[]
  completed: boolean
  userRound: string | null // ronda actual del usuario
  userEliminated: boolean
}

/* -------------------------------------------------------------------------- */
/*  Round helpers                                                              */
/* -------------------------------------------------------------------------- */

export function getRounds(drawSize: number): string[] {
  const map: Record<number, string[]> = {
    128: ["R128", "R64", "R32", "R16", "QF", "SF", "F"],
    48:  ["R48", "R24", "R16", "QF", "SF", "F"],
    32:  ["R32", "R16", "QF", "SF", "F"],
    16:  ["R16", "QF", "SF", "F"],
  }
  return map[drawSize] ?? ["R32", "R16", "QF", "SF", "F"]
}

export function roundLabel(round: string): string {
  const labels: Record<string, string> = {
    R128: "Primera ronda", R64: "Segunda ronda", R48: "Primera ronda",
    R32: "Primera ronda", R24: "Primera ronda", R16: "Octavos",
    QF: "Cuartos de final", SF: "Semifinal", F: "Final",
    Q1: "Qualifying R1", Q2: "Qualifying R2",
  }
  return labels[round] ?? round
}

export function pointsForRound(t: TournamentDef, round: string): number {
  return t.rankingPoints[round] ?? 0
}

export function prizeForRound(t: TournamentDef, round: string): number {
  return t.prizePerRound[round] ?? 0
}

/* -------------------------------------------------------------------------- */
/*  Can the user enter this tournament?                                        */
/* -------------------------------------------------------------------------- */

export type EntryStatus =
  | "direct"       // entrada directa al cuadro
  | "qualifying"   // debe jugar qualifying
  | "ineligible"   // ranking muy bajo para entrar
  | "wildcard"     // podría recibir wildcard (challenger)

export function getEntryStatus(t: TournamentDef, userRank: number): EntryStatus {
  if (userRank <= t.minRankToEnterDirect) return "direct"
  if (t.qualifyingSize > 0) return "qualifying"
  // Challengers can give wildcards to players ranked up to ~300
  if (t.category === "challenger125" && userRank <= 350) return "wildcard"
  return "ineligible"
}

/* -------------------------------------------------------------------------- */
/*  Build the draw — seed top players, fill rest by ranking                    */
/* -------------------------------------------------------------------------- */

export function buildDraw(
  t: TournamentDef,
  allRivals: Rival[],
  userRival: Rival,
  entryStatus: EntryStatus,
): TournamentDraw {
  const rounds = getRounds(t.drawSize)
  const firstRound = rounds[0]

  // Select field: top ranked players who'd enter this tournament
  const eligible = allRivals
    .filter((r) => r.id !== "USER" && r.rank <= t.minRankToEnterDirect + 30)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, t.drawSize - (entryStatus === "direct" || entryStatus === "wildcard" ? 1 : 0))

  // Fill to draw size with lower ranked players if needed
  while (eligible.length < t.drawSize - 1) {
    const filler = allRivals.find(
      (r) => r.id !== "USER" && !eligible.find((e) => e.id === r.id)
    )
    if (filler) eligible.push(filler)
    else break
  }

  // Shuffle non-seeded portion (seeds 1-8 stay in fixed quadrants)
  const seeds = eligible.slice(0, Math.min(8, eligible.length))
  const unseeded = eligible.slice(seeds.length)
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]]
  }

  // Build player slot array (draw positions)
  const slots: (Rival | null)[] = new Array(t.drawSize).fill(null)

  // Place seeds in standard ATP positions
  const seedPositions: Record<number, number[]> = {
    32: [0, 31, 15, 16, 7, 24, 8, 23],
    48: [0, 47, 23, 24, 11, 36, 12, 35],
    128: [0, 127, 63, 64, 31, 96, 32, 95],
    16: [0, 15, 7, 8, 3, 12, 4, 11],
  }
  const positions = seedPositions[t.drawSize] ?? seedPositions[32]
  seeds.forEach((s, i) => {
    if (positions[i] !== undefined) slots[positions[i]] = s
  })

  // Fill remaining slots with unseeded + user
  const players = entryStatus === "direct" || entryStatus === "wildcard"
    ? [...unseeded, userRival]
    : unseeded

  let pi = 0
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) {
      slots[i] = players[pi++] ?? null
    }
  }

  // Build first-round matches
  const matches: DrawMatch[] = []
  for (let i = 0; i < t.drawSize / 2; i++) {
    const p1 = slots[i * 2]
    const p2 = slots[i * 2 + 1]
    matches.push({
      id: `${t.id}-${firstRound}-${i}`,
      round: firstRound,
      position: i,
      player1: p1,
      player2: p2,
      winner: null,
      score: null,
      isUserMatch: p1?.id === "USER" || p2?.id === "USER",
      status: "scheduled",
    })
  }

  // Qualifying matches (Wimbledon)
  const qualifyingMatches: DrawMatch[] = []
  if (t.qualifyingSize > 0 && entryStatus === "qualifying") {
    const qualPlayers = allRivals
      .filter((r) => r.id !== "USER" && r.rank > t.minRankToEnterDirect)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, t.qualifyingDrawSize - 1)

    const qualSlots = [...qualPlayers, userRival]
    for (let i = qualSlots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[qualSlots[i], qualSlots[j]] = [qualSlots[j], qualSlots[i]]
    }

    for (let i = 0; i < qualSlots.length / 2; i++) {
      qualifyingMatches.push({
        id: `${t.id}-Q1-${i}`,
        round: "Q1",
        position: i,
        player1: qualSlots[i * 2] ?? null,
        player2: qualSlots[i * 2 + 1] ?? null,
        winner: null,
        score: null,
        isUserMatch: qualSlots[i * 2]?.id === "USER" || qualSlots[i * 2 + 1]?.id === "USER",
        status: "scheduled",
      })
    }
  }

  const userInDraw = entryStatus === "direct" || entryStatus === "wildcard"
  const userFirstRound = userInDraw
    ? firstRound
    : entryStatus === "qualifying"
    ? "Q1"
    : null

  return {
    tournamentId: t.id,
    rounds,
    matches,
    qualifyingMatches,
    completed: false,
    userRound: userFirstRound,
    userEliminated: entryStatus === "ineligible",
  }
}

/* -------------------------------------------------------------------------- */
/*  Simulate a single match (non-user)                                        */
/* -------------------------------------------------------------------------- */

function surfaceBonus(r: Rival, surface: Surface): number {
  const map: Record<Surface, keyof typeof r.attributes> = {
    clay: "stamina",
    grass: "serve",
    hard: "forehand",
    carpet: "volley",
  }
  return ((r.attributes[map[surface]] ?? 70) - 70) * 0.15
}

export function simulateMatchResult(
  p1: Rival,
  p2: Rival,
  surface: Surface,
  bestOf: 3 | 5,
): { winner: Rival; loser: Rival; score: string } {
  const ovr1 = p1.overall + surfaceBonus(p1, surface) + (Math.random() - 0.5) * 6
  const ovr2 = p2.overall + surfaceBonus(p2, surface) + (Math.random() - 0.5) * 6

  const prob1 = ovr1 / (ovr1 + ovr2)
  const setsToWin = bestOf === 5 ? 3 : 2
  const sets1: number[] = []
  const sets2: number[] = []

  let w1 = 0
  let w2 = 0

  while (w1 < setsToWin && w2 < setsToWin) {
    const setProb = prob1 * 0.7 + 0.15
    if (Math.random() < setProb) {
      w1++
      // Score for this set
      if (Math.random() < 0.3) { sets1.push(7); sets2.push(6) }
      else if (Math.random() < 0.4) { sets1.push(6); sets2.push(4) }
      else if (Math.random() < 0.5) { sets1.push(6); sets2.push(3) }
      else { sets1.push(6); sets2.push(2) }
    } else {
      w2++
      if (Math.random() < 0.3) { sets1.push(6); sets2.push(7) }
      else if (Math.random() < 0.4) { sets1.push(4); sets2.push(6) }
      else if (Math.random() < 0.5) { sets1.push(3); sets2.push(6) }
      else { sets1.push(2); sets2.push(6) }
    }
  }

  const score = sets1.map((s, i) => `${s}-${sets2[i]}`).join(" ")
  const winner = w1 > w2 ? p1 : p2
  const loser = w1 > w2 ? p2 : p1
  return { winner, loser, score }
}

/* -------------------------------------------------------------------------- */
/*  Simulate all non-user matches in a round                                  */
/* -------------------------------------------------------------------------- */

export function simulateRound(
  draw: TournamentDraw,
  round: string,
  t: TournamentDef,
): TournamentDraw {
  const updated = { ...draw, matches: [...draw.matches] }
  const roundMatches = updated.matches.filter((m) => m.round === round && !m.isUserMatch && m.status === "scheduled")

  roundMatches.forEach((match) => {
    if (!match.player1 || !match.player2) return
    const { winner, score } = simulateMatchResult(match.player1, match.player2, t.surface, t.bestOf)
    match.winner = winner
    match.score = score
    match.status = "completed"

    // Advance winner to next round
    advanceWinner(updated, match, draw.rounds, t)
  })

  return updated
}

function advanceWinner(draw: TournamentDraw, match: DrawMatch, rounds: string[], t: TournamentDef) {
  const roundIdx = rounds.indexOf(match.round)
  if (roundIdx === rounds.length - 1) return // was the final

  const nextRound = rounds[roundIdx + 1]
  const nextPosition = Math.floor(match.position / 2)

  let nextMatch = draw.matches.find((m) => m.round === nextRound && m.position === nextPosition)
  if (!nextMatch) {
    nextMatch = {
      id: `${t.id}-${nextRound}-${nextPosition}`,
      round: nextRound,
      position: nextPosition,
      player1: null,
      player2: null,
      winner: null,
      score: null,
      isUserMatch: false,
      status: "scheduled",
    }
    draw.matches.push(nextMatch)
  }

  if (match.position % 2 === 0) nextMatch.player1 = match.winner
  else nextMatch.player2 = match.winner

  if (nextMatch.player1?.id === "USER" || nextMatch.player2?.id === "USER") {
    nextMatch.isUserMatch = true
  }
}

/* -------------------------------------------------------------------------- */
/*  Get the user's current match                                              */
/* -------------------------------------------------------------------------- */

export function getUserMatch(draw: TournamentDraw, round: string): DrawMatch | null {
  const allMatches = [...draw.qualifyingMatches, ...draw.matches]
  return allMatches.find((m) => m.round === round && m.isUserMatch) ?? null
}

export function getMatchesInRound(draw: TournamentDraw, round: string): DrawMatch[] {
  const allMatches = [...draw.qualifyingMatches, ...draw.matches]
  return allMatches.filter((m) => m.round === round)
}

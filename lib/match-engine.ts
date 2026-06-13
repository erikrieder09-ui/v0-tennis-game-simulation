// lib/match-engine.ts
// Motor de simulación punto a punto — soporta best-of-3 y best-of-5

import type { Rival, Surface } from "./types"

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface MatchConfig {
  player1: Rival
  player2: Rival
  surface: Surface
  bestOf: 3 | 5
  finalSetTiebreak: boolean
  finalSetTiebreakAt: number // 7 = tiebreak normal, 10 = super-tiebreak
}

export interface PointEvent {
  type: "ace" | "double-fault" | "winner" | "forced-error" | "unforced-error" | "rally"
  winner: 1 | 2
  description: string
  rallyLength?: number
}

export interface GameScore {
  p1: number // raw points (0,1,2,3,4+)
  p2: number
  deuce: boolean
  advantage: 1 | 2 | null
}

export interface SetScore {
  p1: number
  p2: number
  tiebreak?: { p1: number; p2: number }
}

export interface MatchState {
  config: MatchConfig
  sets: SetScore[]
  currentSet: SetScore
  currentGame: GameScore
  serving: 1 | 2
  firstServer: 1 | 2
  isTiebreak: boolean
  tiebreakPoints: { p1: number; p2: number }
  setsWon: { p1: number; p2: number }
  over: boolean
  winner: 1 | 2 | null
  stats: MatchStats
  log: PointEvent[]
}

export interface MatchStats {
  aces: [number, number]
  doubleFaults: [number, number]
  winners: [number, number]
  unforcedErrors: [number, number]
  pointsWon: [number, number]
  breakPointsWon: [number, number]
  breakPointsFaced: [number, number]
  gamesWon: [number, number]
}

/* -------------------------------------------------------------------------- */
/*  Score display helpers                                                      */
/* -------------------------------------------------------------------------- */

const POINT_LABELS = ["0", "15", "30", "40"]

export function displayGameScore(g: GameScore): [string, string] {
  if (g.deuce) return ["40", "40"]
  if (g.advantage === 1) return ["Adv", "40"]
  if (g.advantage === 2) return ["40", "Adv"]
  return [POINT_LABELS[g.p1] ?? "0", POINT_LABELS[g.p2] ?? "0"]
}

export function displaySetScore(s: SetScore): string {
  if (s.tiebreak) return `${s.p1}-${s.p2}(${Math.min(s.tiebreak.p1, s.tiebreak.p2)})`
  return `${s.p1}-${s.p2}`
}

export function displayScore(state: MatchState): string {
  const sets = [...state.sets, state.currentSet]
    .map((s) => displaySetScore(s))
    .join(" ")
  return sets
}

/* -------------------------------------------------------------------------- */
/*  Win probability engine                                                     */
/* -------------------------------------------------------------------------- */

function surfaceWeight(r: Rival, surface: Surface): number {
  let bonus = 0

  // superficie favorita
  if (r.favSurface === surface) bonus += 3

  switch (r.playStyle) {

    case "serve-volley":
      if (surface === "grass") bonus += 5
      if (surface === "hard") bonus += 2
      break

    case "aggressive-baseline":
      if (surface === "hard") bonus += 4
      break

    case "defensive-baseline":
      if (surface === "clay") bonus += 5
      break

    case "all-around":
      bonus += 2
      break
  }

  return bonus
}

function isMomentumCritical(state: MatchState): boolean {
  const { setsWon, currentSet, currentGame, isTiebreak } = state
  if (setsWon.p1 > 0 || setsWon.p2 > 0) return true  // past first set
  if (isTiebreak) return true
  if (currentSet.p1 >= 5 || currentSet.p2 >= 5) return true
  if (currentGame.deuce || currentGame.advantage !== null) return true
  return false
}

export function pointWinProbability(state: MatchState): number {
  const { config, serving } = state
  const p1 = config.player1
  const p2 = config.player2


  // Base from overall + surface
  let score1 = p1.overall + surfaceWeight(p1, config.surface)
  let score2 = p2.overall + surfaceWeight(p2, config.surface)

  // Server advantage on grass
  if (config.surface === "grass") {
    if (serving === 1) score1 += 4
    else score2 += 4
  }

  // Mentality in critical moments
  if (isMomentumCritical(state)) {
    score1 += (p1.attributes.mentality - 65) * 0.3
    score2 += (p2.attributes.mentality - 65) * 0.3
  }

  // Random variation (allows upsets)
score1 += (Math.random() - 0.5) * 4
score2 += (Math.random() - 0.5) * 4

  // Fitness
score1 += ((p1.attributes.fitness ?? 100) - 70) * 0.2
score2 += ((p2.attributes.fitness ?? 100)- 70) * 0.2

  // Fitness factor (lower fitness = worse performance)
  const total = score1 + score2
  return total > 0 ? score1 / total : 0.5
}

/* -------------------------------------------------------------------------- */
/*  Point event generation                                                     */
/* -------------------------------------------------------------------------- */

const ACE_PHRASES = [
  "¡Ace por la T!", "¡Ace al cuerpo!", "¡Ace externo!", "Saque imparable",
  "¡Ace a 220 km/h!", "Saque sin respuesta",
]
const DF_PHRASES = [
  "Doble falta.", "Segundo saque a la red.", "Doble falta bajo presión.",
  "Se fue larga la segunda bola.",
]
const WINNER_PHRASES = [
  "¡Winner de derecha cruzado!", "¡Winner de revés!", "¡Passing shot!",
  "¡Volea ganadora!", "¡Smash inapelable!", "¡Winner por el pasillo!",
  "¡Dejada perfecta!", "¡Winner al cuerpo!",
]
const FORCED_PHRASES = [
  "Error forzado por la presión.", "Fallo ante un golpe difícil.",
  "La bola se va larga por el ángulo.", "No llega al passing.",
]
const UNFORCED_PHRASES = [
  "Error no forzado a la red.", "Fallo innecesario.", "Se va largo.",
  "Error en un momento clave.", "Se va ancha.",
]

function randomFrom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generatePointEvent(state: MatchState, winner: 1 | 2): PointEvent {
  const serving = state.serving
  const r = Math.random()
  const isGrass = state.config.surface === "grass"

  // Ace — más probable en pasto
  if (r < (isGrass ? 0.13 : 0.08) && winner === serving) {
    return { type: "ace", winner, description: randomFrom(ACE_PHRASES) }
  }
  // Double fault — siempre del que sirve y pierde
  if (r < (isGrass ? 0.17 : 0.13) && winner !== serving) {
    return { type: "double-fault", winner, description: randomFrom(DF_PHRASES) }
  }
  // Winner
  if (r < 0.42) {
    return { type: "winner", winner, description: randomFrom(WINNER_PHRASES) }
  }
  // Forced error
  if (r < 0.62) {
    return { type: "forced-error", winner, description: randomFrom(FORCED_PHRASES) }
  }
  // Unforced error
  if (r < 0.76) {
    return { type: "unforced-error", winner, description: randomFrom(UNFORCED_PHRASES) }
  }
  // Rally
  const shots = 5 + Math.floor(Math.random() * 22)
  return {
    type: "rally",
    winner,
    description: `Rally de ${shots} golpes — punto para el jugador ${winner}`,
    rallyLength: shots,
  }
}

/* -------------------------------------------------------------------------- */
/*  State mutations                                                            */
/* -------------------------------------------------------------------------- */

export function createMatchState(config: MatchConfig): MatchState {
  const firstServer = (Math.random() < 0.5 ? 1 : 2) as 1 | 2
  return {
    config,
    sets: [],
    currentSet: { p1: 0, p2: 0 },
    currentGame: { p1: 0, p2: 0, deuce: false, advantage: null },
    serving: firstServer,
    firstServer,
    isTiebreak: false,
    tiebreakPoints: { p1: 0, p2: 0 },
    setsWon: { p1: 0, p2: 0 },
    over: false,
    winner: null,
    stats: {
      aces: [0, 0],
      doubleFaults: [0, 0],
      winners: [0, 0],
      unforcedErrors: [0, 0],
      pointsWon: [0, 0],
      breakPointsWon: [0, 0],
      breakPointsFaced: [0, 0],
      gamesWon: [0, 0],
    },
    log: [],
  }
}

/** Play one point and return the new state (immutable-ish). */
export function playPoint(state: MatchState): { state: MatchState; event: PointEvent } {
  if (state.over) return { state, event: { type: "rally", winner: 1, description: "Partido terminado." } }

  const prob = pointWinProbability(state)
  const winner: 1 | 2 = Math.random() < prob ? 1 : 2
  const event = generatePointEvent(state, winner)

  // Update stats
  const s = { ...state, stats: { ...state.stats } }
  s.stats.pointsWon = [s.stats.pointsWon[0], s.stats.pointsWon[1]] as [number, number]
  s.stats.pointsWon[winner - 1]++

  if (event.type === "ace") s.stats.aces[state.serving - 1]++
  if (event.type === "double-fault") s.stats.doubleFaults[state.serving - 1]++
  if (event.type === "winner") s.stats.winners[winner - 1]++
  if (event.type === "unforced-error") s.stats.unforcedErrors[2 - winner]++

  s.log = [...s.log, event]

  if (s.isTiebreak) {
    return { state: applyTiebreakPoint(s, winner), event }
  } else {
    return { state: applyGamePoint(s, winner), event }
  }
}

function applyTiebreakPoint(state: MatchState, winner: 1 | 2): MatchState {
  const s = { ...state, tiebreakPoints: { ...state.tiebreakPoints } }
  if (winner === 1) s.tiebreakPoints.p1++
  else s.tiebreakPoints.p2++

  const { p1, p2 } = s.tiebreakPoints
  const target = state.config.finalSetTiebreakAt

  const won =
    (p1 >= target && p1 - p2 >= 2) ||
    (p2 >= target && p2 - p1 >= 2)

  if (won) {
    const setWinner: 1 | 2 = p1 > p2 ? 1 : 2
    const finishedSet: SetScore = {
      p1: state.currentSet.p1 + (setWinner === 1 ? 1 : 0),
      p2: state.currentSet.p2 + (setWinner === 2 ? 1 : 0),
      tiebreak: { p1, p2 },
    }
    return awardSet(s, setWinner, finishedSet)
  }

  // Change server every 2 points (first change after 1)
  const totalPoints = p1 + p2
  if (totalPoints % 2 === 1) {
    s.serving = s.serving === 1 ? 2 : 1
  }

  return s
}

function applyGamePoint(state: MatchState, winner: 1 | 2): MatchState {
  const s = { ...state, currentGame: { ...state.currentGame } }
  const g = s.currentGame

  if (g.deuce) {
    if (g.advantage === winner) {
      return awardGame(s, winner)
    } else if (g.advantage === null) {
      g.advantage = winner
    } else {
      g.advantage = null // back to deuce
    }
    return s
  }

  if (winner === 1) g.p1++
  else g.p2++

  // Check win: 4 points and 2 ahead, or deuce
  if (g.p1 === 3 && g.p2 === 3) {
    g.deuce = true
    return s
  }
  if (g.p1 >= 4 && g.p1 - g.p2 >= 2) return awardGame(s, 1)
  if (g.p2 >= 4 && g.p2 - g.p1 >= 2) return awardGame(s, 2)

  return s
}

function awardGame(state: MatchState, winner: 1 | 2): MatchState {
  const s = {
    ...state,
    currentGame: { p1: 0, p2: 0, deuce: false, advantage: null },
    currentSet: { ...state.currentSet },
    serving: (state.serving === 1 ? 2 : 1) as 1 | 2,
  }
  s.stats = { ...s.stats, gamesWon: [...s.stats.gamesWon] as [number, number] }
  s.stats.gamesWon[winner - 1]++

  if (winner === 1) s.currentSet.p1++
  else s.currentSet.p2++

  return checkSetWin(s)
}

function checkSetWin(state: MatchState): MatchState {
  const { p1, p2 } = state.currentSet
  const setsToWin = state.config.bestOf === 5 ? 3 : 2
  const isDecidingSet =
    state.setsWon.p1 === setsToWin - 1 && state.setsWon.p2 === setsToWin - 1

  // Normal set win
  if (p1 >= 6 && p1 - p2 >= 2) return awardSet(state, 1, state.currentSet)
  if (p2 >= 6 && p2 - p1 >= 2) return awardSet(state, 2, state.currentSet)

  // 7-5 win
  if ((p1 === 7 && p2 === 5) || (p2 === 7 && p1 === 5)) {
    return awardSet(state, p1 > p2 ? 1 : 2, state.currentSet)
  }

  // Tiebreak at 6-6
  if (p1 === 6 && p2 === 6) {
    // Deciding set: check if tiebreak applies
    if (isDecidingSet && !state.config.finalSetTiebreak) {
      // No tiebreak — keep playing (Wimbledon old rules, but post-2019 there's always tiebreak)
      return state
    }
    return { ...state, isTiebreak: true, tiebreakPoints: { p1: 0, p2: 0 } }
  }

  return state
}

function awardSet(state: MatchState, winner: 1 | 2, finishedSet: SetScore): MatchState {
  const setsToWin = state.config.bestOf === 5 ? 3 : 2
  const newSetsWon = {
    p1: state.setsWon.p1 + (winner === 1 ? 1 : 0),
    p2: state.setsWon.p2 + (winner === 2 ? 1 : 0),
  }

  const matchOver = newSetsWon.p1 === setsToWin || newSetsWon.p2 === setsToWin

  return {
    ...state,
    sets: [...state.sets, finishedSet],
    currentSet: { p1: 0, p2: 0 },
    currentGame: { p1: 0, p2: 0, deuce: false, advantage: null },
    isTiebreak: false,
    tiebreakPoints: { p1: 0, p2: 0 },
    serving: state.firstServer, // server resets each set
    setsWon: newSetsWon,
    over: matchOver,
    winner: matchOver ? winner : null,
  }
}

/* -------------------------------------------------------------------------- */
/*  Bulk simulation helpers                                                    */
/* -------------------------------------------------------------------------- */

/** Play one full game and return updated state + events. */
export function playGame(state: MatchState): { state: MatchState; events: PointEvent[] } {
  const events: PointEvent[] = []
  const startGames = state.stats.gamesWon[0] + state.stats.gamesWon[1]
  let s = state

  while (!s.over) {
    const { state: ns, event } = playPoint(s)
    events.push(event)
    s = ns
    const currentGames = s.stats.gamesWon[0] + s.stats.gamesWon[1]
    if (currentGames > startGames) break
  }

  return { state: s, events }
}

/** Play one full set and return updated state + events. */
export function playSet(state: MatchState): { state: MatchState; events: PointEvent[] } {
  const events: PointEvent[] = []
  const startSets = state.sets.length
  let s = state

  while (!s.over && s.sets.length === startSets) {
    const { state: ns, event } = playPoint(s)
    events.push(event)
    s = ns
  }

  return { state: s, events }
}

/** Simulate the entire match instantly. */
export function simulateFullMatch(config: MatchConfig): MatchState {
  let state = createMatchState(config)
  let guard = 0
  while (!state.over && guard < 10000) {
    const { state: ns } = playPoint(state)
    state = ns
    guard++
  }
  return state
}

/** Format completed match score as "6-4 3-6 7-6(4)" */
export function formatMatchScore(state: MatchState, perspective: 1 | 2): string {
  return state.sets
    .map((s) => {
      const a = perspective === 1 ? s.p1 : s.p2
      const b = perspective === 1 ? s.p2 : s.p1
      const tb = s.tiebreak
        ? `(${perspective === 1 ? Math.min(s.tiebreak.p1, s.tiebreak.p2) : Math.min(s.tiebreak.p1, s.tiebreak.p2)})`
        : ""
      return `${a}-${b}${tb}`
    })
    .join(" ")
}

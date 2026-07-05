import type { Rival, Tour } from "./types"
import { getRankings } from "./rivals"

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                      */
/* -------------------------------------------------------------------------- */

export interface DavisTeam {
  country: string        // código de 3 letras (ARG, ESP, etc.)
  players: Rival[]       // top 4 jugadores del país por ranking
  captain: string        // apellido del capitán (el mejor jugador del equipo)
}

export interface DavisMatch {
  id: string
  type: "single1" | "single2" | "doubles" | "single3" | "single4"
  homePlayer1: Rival | null   // jugador local
  homePlayer2: Rival | null   // solo para dobles
  awayPlayer1: Rival | null   // jugador visitante
  awayPlayer2: Rival | null   // solo para dobles
  winner: "home" | "away" | null
  score: string | null
  isUser: boolean
}

export interface DavisSeries {
  id: string
  round: number           // 1=primera ronda, 2=semis, 3=final, 4=final
  home: DavisTeam
  away: DavisTeam
  surface: "hard" | "clay" | "grass"
  matches: DavisMatch[]
  homeWins: number
  awayWins: number
  winner: "home" | "away" | null
}

export interface DavisCupState {
  year: number
  teams: DavisTeam[]
  rounds: DavisSeries[][]   // rounds[0] = cuartos, rounds[1] = semis, rounds[2] = final
  currentRound: number      // 0-3
  userCountry: string
  userInvited: boolean
  userAccepted: boolean
  completed: boolean
}

/* -------------------------------------------------------------------------- */
/*  Países participantes                                                        */
/* -------------------------------------------------------------------------- */

// Los 16 países históricos más fuertes de la Copa Davis
const DAVIS_CUP_COUNTRIES = [
  "ESP", "USA", "AUS", "FRA", "ARG", "ITA", "GER", "GBR",
  "SRB", "CZE", "CRO", "RUS", "SUI", "BEL", "NED", "POL"
]

/* -------------------------------------------------------------------------- */
/*  Armar equipos por ranking de naciones                                      */
/* -------------------------------------------------------------------------- */

export function buildDavisTeams(currentDate: string): DavisTeam[] {
  const roster = getRankings("ATP", currentDate)

  // Calcular puntos por nación (suma de los top 4 jugadores)
  const nationPoints: Record<string, number> = {}
  const nationPlayers: Record<string, Rival[]> = {}

  for (const rival of roster) {
    if (!nationPlayers[rival.nationality]) nationPlayers[rival.nationality] = []
    if (nationPlayers[rival.nationality].length < 4) {
      nationPlayers[rival.nationality].push(rival)
      nationPoints[rival.nationality] = (nationPoints[rival.nationality] ?? 0) + rival.points
    }
  }

  // Elegir los 16 países con más puntos, priorizando los históricos
  const historicalBonus: Record<string, number> = {}
  DAVIS_CUP_COUNTRIES.forEach(c => { historicalBonus[c] = 500 })

  const sorted = Object.entries(nationPoints)
    .map(([country, pts]) => ({ country, pts: pts + (historicalBonus[country] ?? 0) }))
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 16)
    .map(e => e.country)

  return sorted.map(country => {
    const players = (nationPlayers[country] ?? []).slice(0, 4)
    return {
      country,
      players,
      captain: players[0]?.lastName ?? country,
    }
  })
}

/* -------------------------------------------------------------------------- */
/*  PRNG determinístico para sorteos                                           */
/* -------------------------------------------------------------------------- */

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

/* -------------------------------------------------------------------------- */
/*  Sorteo del cuadro                                                          */
/* -------------------------------------------------------------------------- */

export function drawDavisCup(teams: DavisTeam[], year: number): DavisSeries[][] {
  const rand = seededRandom(year * 31337)
  const shuffled = [...teams].sort(() => rand() - 0.5)

  const SURFACES: ("hard" | "clay" | "grass")[] = ["hard", "clay", "grass"]

  function makeSeries(home: DavisTeam, away: DavisTeam, round: number, index: number): DavisSeries {
    const captainFavSurface = home.players[0]?.favSurface
    const surface: "hard" | "clay" | "grass" =
      (captainFavSurface === "hard" || captainFavSurface === "clay" || captainFavSurface === "grass")
        ? captainFavSurface
        : SURFACES[Math.floor(rand() * SURFACES.length)]
    return {
      id: `davis-${year}-r${round}-${index}`,
      round,
      home,
      away,
      surface,
      matches: [],
      homeWins: 0,
      awayWins: 0,
      winner: null,
    }
  }

  // Octavos de final (8 series, 16 equipos) — febrero
  const roundOf16: DavisSeries[] = []
  for (let i = 0; i < 8; i++) {
    roundOf16.push(makeSeries(shuffled[i * 2], shuffled[i * 2 + 1], 1, i))
  }

  return [roundOf16, [], [], []] // 4 rondas: octavos, cuartos, semis, final
}

/* -------------------------------------------------------------------------- */
/*  Superficie bonus                                                           */
/* -------------------------------------------------------------------------- */

export function surfaceBonus(rival: Rival, surface: string): number {
  if (rival.favSurface === surface) return 4
  return 0
}

/* -------------------------------------------------------------------------- */
/*  Simular un partido individual de Davis (best of 5)                         */
/* -------------------------------------------------------------------------- */

export function simulateDavisMatch(
  p1: Rival,
  p2: Rival,
  surface: string,
  homeBonus: number = 0
): { winner: Rival; loser: Rival; score: string } {
  const ovr1 = p1.overall + surfaceBonus(p1, surface) + homeBonus + (Math.random() - 0.5) * 6
  const ovr2 = p2.overall + surfaceBonus(p2, surface) + (Math.random() - 0.5) * 6
  const prob1 = ovr1 / (ovr1 + ovr2)

  let w1 = 0, w2 = 0
  const sets1: number[] = [], sets2: number[] = []

  while (w1 < 3 && w2 < 3) {
    if (Math.random() < prob1 * 0.7 + 0.15) {
      w1++
      const r = Math.random()
      if (r < 0.3) { sets1.push(7); sets2.push(6) }
      else if (r < 0.6) { sets1.push(6); sets2.push(4) }
      else { sets1.push(6); sets2.push(3) }
    } else {
      w2++
      const r = Math.random()
      if (r < 0.3) { sets1.push(6); sets2.push(7) }
      else if (r < 0.6) { sets1.push(4); sets2.push(6) }
      else { sets1.push(3); sets2.push(6) }
    }
  }

  const score = sets1.map((s, i) => `${s}-${sets2[i]}`).join(" ")
  return w1 > w2 ? { winner: p1, loser: p2, score } : { winner: p2, loser: p1, score }
}

/* -------------------------------------------------------------------------- */
/*  Simular una serie completa (CPU vs CPU)                                   */
/* -------------------------------------------------------------------------- */

export function simulateDavisSeries(series: DavisSeries): DavisSeries {
  const { home, away, surface } = series
  const HOME_BONUS = 3 // bonus de localía

  const homeS1 = home.players[0]
  const homeS2 = home.players[1]
  const awayS1 = away.players[0]
  const awayS2 = away.players[1]

  if (!homeS1 || !homeS2 || !awayS1 || !awayS2) return series

  let homeWins = 0
  let awayWins = 0
  const matches: DavisMatch[] = []

  const matchups: Array<{ id: DavisMatch["type"]; p1: Rival; p2: Rival }> = [
    { id: "single1", p1: homeS1, p2: awayS1 },
    { id: "single2", p1: homeS2, p2: awayS2 },
    { id: "doubles", p1: homeS1, p2: awayS1 }, // simplificado
    { id: "single3", p1: homeS1, p2: awayS2 },
    { id: "single4", p1: homeS2, p2: awayS1 },
  ]

  for (const mu of matchups) {
    if (homeWins === 3 || awayWins === 3) {
      matches.push({
        id: `${series.id}-${mu.id}`,
        type: mu.id,
        homePlayer1: mu.p1,
        homePlayer2: null,
        awayPlayer1: mu.p2,
        awayPlayer2: null,
        winner: null,
        score: null,
        isUser: false,
      })
      continue
    }

    const result = simulateDavisMatch(mu.p1, mu.p2, surface, HOME_BONUS)
    const homeWon = result.winner.id === mu.p1.id

    if (homeWon) homeWins++
    else awayWins++

    matches.push({
      id: `${series.id}-${mu.id}`,
      type: mu.id,
      homePlayer1: mu.p1,
      homePlayer2: null,
      awayPlayer1: mu.p2,
      awayPlayer2: null,
      winner: homeWon ? "home" : "away",
      score: result.score,
      isUser: false,
    })
  }

  return {
    ...series,
    matches,
    homeWins,
    awayWins,
    winner: homeWins >= 3 ? "home" : "away",
  }
}

/* -------------------------------------------------------------------------- */
/*  Avanzar ronda                                                              */
/* -------------------------------------------------------------------------- */

export function advanceDavisRound(
  completedSeries: DavisSeries[],
  round: number,
  year: number
): DavisSeries[] {
  const rand = seededRandom(year * 31337 + round * 1000)
  const SURFACES: ("hard" | "clay" | "grass")[] = ["hard", "clay", "grass"]

  const winners = completedSeries
    .map(s => s.winner === "home" ? s.home : s.away)
    .filter(Boolean) as DavisTeam[]

  const nextSeries: DavisSeries[] = []
  for (let i = 0; i < winners.length; i += 2) {
    const home = winners[i]
    const away = winners[i + 1]
    if (!home || !away) continue
    const surface = SURFACES[Math.floor(rand() * SURFACES.length)]
    nextSeries.push({
      id: `davis-${year}-r${round}-${i / 2}`,
      round,
      home,
      away,
      surface,
      matches: [],
      homeWins: 0,
      awayWins: 0,
      winner: null,
    })
  }
  return nextSeries
}

/* -------------------------------------------------------------------------- */
/*  Inicializar Copa Davis para un año                                         */
/* -------------------------------------------------------------------------- */

export function initDavisCup(year: number, currentDate: string, userCountry: string): DavisCupState {
  const teams = buildDavisTeams(currentDate)
  const rounds = drawDavisCup(teams, year)

  return {
    year,
    teams,
    rounds,
    currentRound: 0,
    userCountry,
    userInvited: false,
    userAccepted: false,
    completed: false,
  }
}

/* -------------------------------------------------------------------------- */
/*  Convocatoria del usuario                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Verifica si el usuario merece ser convocado al equipo de su país.
 * El usuario entra si está entre los top 4 de su nación en el ranking.
 */
export function checkUserInvitation(
  userCountry: string,
  userRank: number,
  userOverall: number,
  teams: DavisTeam[]
): { invited: boolean; position: number; replacedPlayer: Rival | null } {
  const team = teams.find(t => t.country === userCountry)
  if (!team) return { invited: false, position: -1, replacedPlayer: null }

  // Ver si el usuario es mejor que alguno de los 4 del equipo
  const players = team.players
  const worstInTeam = players[players.length - 1]

  if (!worstInTeam || players.length < 4) {
    return { invited: true, position: players.length, replacedPlayer: null }
  }

  if (userRank < worstInTeam.rank) {
    return { invited: true, position: players.length - 1, replacedPlayer: worstInTeam }
  }

  return { invited: false, position: -1, replacedPlayer: null }
}
export type InjuryType =
  | "fatiga-muscular"
  | "hombro"
  | "tobillo"
  | "rodilla"
  | "muneca"
  | "espalda"
  | "tendon"

export interface Injury {
  type: InjuryType
  label: string
  weeksOut: number
  recoveryWeeks: number // semanas extra para recuperar atributos tras volver
  affectedAttributes: string[]
  attributePenalty: number // puntos que bajan mientras está lesionado
}

export const INJURIES: Record<InjuryType, Omit<Injury, "type">> = {
  "fatiga-muscular": {
    label: "Fatiga muscular",
    weeksOut: 1,
    recoveryWeeks: 0,
    affectedAttributes: ["stamina", "speed"],
    attributePenalty: 4,
  },
  "hombro": {
    label: "Lesión de hombro",
    weeksOut: 3,
    recoveryWeeks: 0,
    affectedAttributes: ["serve", "volley"],
    attributePenalty: 6,
  },
  "tobillo": {
    label: "Esguince de tobillo",
    weeksOut: 3,
    recoveryWeeks: 0,
    affectedAttributes: ["speed", "defense"],
    attributePenalty: 6,
  },
  "rodilla": {
    label: "Lesión de rodilla",
    weeksOut: 4,
    recoveryWeeks: 2,
    affectedAttributes: ["speed", "stamina"],
    attributePenalty: 8,
  },
  "muneca": {
    label: "Lesión de muñeca",
    weeksOut: 4,
    recoveryWeeks: 2,
    affectedAttributes: ["drive", "backhand", "serve"],
    attributePenalty: 7,
  },
  "espalda": {
    label: "Lesión de espalda",
    weeksOut: 6,
    recoveryWeeks: 3,
    affectedAttributes: ["serve", "power"],
    attributePenalty: 8,
  },
  "tendon": {
    label: "Rotura de tendón",
    weeksOut: 20,
    recoveryWeeks: 6,
    affectedAttributes: ["speed", "stamina", "defense"],
    attributePenalty: 12,
  },
}

const INJURY_WEIGHTS: [InjuryType, number][] = [
  ["fatiga-muscular", 35],
  ["tobillo",         25],
  ["hombro",          15],
  ["rodilla",         10],
  ["muneca",           8],
  ["espalda",          5],
  ["tendon",           2],
]

function weightedRandom(rand: () => number): InjuryType {
  const total = INJURY_WEIGHTS.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [type, weight] of INJURY_WEIGHTS) {
    r -= weight
    if (r <= 0) return type
  }
  return "fatiga-muscular"
}

export function rollInjury(
  injuryProneness: number,
  fitness: number,
  playedTournamentThisWeek: boolean,
  rand: () => number = Math.random
): InjuryType | null {
  const base = 0.02
  const pronenessBonus = (injuryProneness / 100) * 0.08
  const fitnessBonus = fitness < 30 ? 0.04 : 0
  const tournamentBonus = playedTournamentThisWeek ? 0.02 : 0

  const prob = base + pronenessBonus + fitnessBonus + tournamentBonus

  if (rand() > prob) return null
  return weightedRandom(rand)
}

export function getInjury(type: InjuryType): Injury {
  return { type, ...INJURIES[type] }
}

/** Duración en semanas con varianza aleatoria */
export function rollWeeksOut(type: InjuryType, rand: () => number = Math.random): number {
  const base = INJURIES[type].weeksOut
  const variance = Math.round((rand() - 0.5) * base * 0.4)
  return Math.max(1, base + variance)
}
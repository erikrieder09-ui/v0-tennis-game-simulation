import type { AttributeSet, Backhand, Handedness, PlayStyle, Tour } from "./types"

interface AttributeInput {
  tour: Tour
  playStyle: PlayStyle
  height: number
  weight: number
  age: number
  handedness: Handedness
  backhand: Backhand
}

type VisibleKey = "serve" | "drive" | "backhand" | "volley" | "return" | "defense" | "speed" | "stamina" | "power" | "mentality"

/* -------------------------------------------------------------------------- */
/*  Rangos por estilo [min, max]                                               */
/* -------------------------------------------------------------------------- */

const STYLE_RANGES: Record<PlayStyle, Record<VisibleKey, [number, number]>> = {
  "serve-volley": {
    serve:    [85, 99], drive:    [75, 95], backhand: [65, 90], volley:   [80, 99],
    return:   [60, 88], speed:    [65, 90], defense:  [60, 85], power:    [80, 99],
    stamina:  [70, 95], mentality:[70, 99],
  },
  "aggressive-baseline": {
    serve:    [70, 95], drive:    [85, 99], backhand: [75, 99], volley:   [50, 85],
    return:   [70, 95], speed:    [65, 90], defense:  [60, 90], power:    [85, 99],
    stamina:  [70, 95], mentality:[70, 99],
  },
  "defensive-baseline": {
    serve:    [65, 90], drive:    [75, 95], backhand: [75, 95], volley:   [50, 85],
    return:   [85, 99], speed:    [85, 99], defense:  [85, 99], power:    [60, 90],
    stamina:  [85, 99], mentality:[80, 99],
  },
  "all-around": {
    serve:    [70, 97], drive:    [75, 99], backhand: [75, 99], volley:   [70, 97],
    return:   [70, 97], speed:    [70, 97], defense:  [70, 97], power:    [70, 97],
    stamina:  [70, 97], mentality:[70, 99],
  },
}

// Fracción del rango donde empieza un prospecto joven (~18 años)
const STYLE_START_FRAC: Record<PlayStyle, Record<VisibleKey, number>> = {
  "serve-volley": {
    serve: 0.35, drive: 0.25, backhand: 0.18, volley: 0.35,
    return: 0.12, speed: 0.22, defense: 0.12, power: 0.35,
    stamina: 0.22, mentality: 0.12,
  },
  "aggressive-baseline": {
    serve: 0.25, drive: 0.35, backhand: 0.30, volley: 0.15,
    return: 0.22, speed: 0.22, defense: 0.12, power: 0.35,
    stamina: 0.22, mentality: 0.12,
  },
  "defensive-baseline": {
    serve: 0.18, drive: 0.25, backhand: 0.30, volley: 0.12,
    return: 0.35, speed: 0.35, defense: 0.35, power: 0.18,
    stamina: 0.35, mentality: 0.20,
  },
  "all-around": {
    serve: 0.25, drive: 0.25, backhand: 0.25, volley: 0.25,
    return: 0.25, speed: 0.25, defense: 0.25, power: 0.25,
    stamina: 0.25, mentality: 0.18,
  },
}

/* -------------------------------------------------------------------------- */
/*  Ajustes por altura y peso                                                  */
/* -------------------------------------------------------------------------- */

function heightAdjustment(height: number, tour: Tour): Partial<Record<VisibleKey, number>> {
  const low  = tour === "WTA" ? [150, 165] : [170, 180]
  const high = tour === "WTA" ? [178, 195] : [191, 210]

  if (height >= low[0] && height <= low[1]) {
    return { speed: +5, defense: +5, return: +5, stamina: +5, serve: -5, power: -5 }
  }
  if (height >= high[0] && height <= high[1]) {
    return { serve: +5, power: +5, volley: +5, speed: -5, defense: -5 }
  }
  return {}
}

function weightAdjustment(weight: number, tour: Tour): Partial<Record<VisibleKey, number>> {
  const light = tour === "WTA" ? [50, 62]  : [70, 78]
  const heavy = tour === "WTA" ? [73, 85]  : [85, 105]

  if (weight >= light[0] && weight <= light[1]) {
    return { speed: +3, stamina: +3, power: -3 }
  }
  if (weight >= heavy[0] && weight <= heavy[1]) {
    return { power: +3, serve: +3, speed: -3, stamina: -3 }
  }
  return {}
}

/* -------------------------------------------------------------------------- */
/*  Cómputo principal                                                          */
/* -------------------------------------------------------------------------- */

export function computeAttributes(input: AttributeInput): AttributeSet {
  const ranges = STYLE_RANGES[input.playStyle]
  const fracs  = STYLE_START_FRAC[input.playStyle]

  const base: Record<VisibleKey, number> = {} as any
  for (const key of Object.keys(ranges) as VisibleKey[]) {
    const [min, max] = ranges[key]
    base[key] = min + (max - min) * fracs[key]
  }

  const ageDelta = input.age - 16
  base.mentality += ageDelta * 1.5
  base.stamina   += ageDelta * 0.8
  base.power     += ageDelta * 0.5

  const hAdj = heightAdjustment(input.height, input.tour)
  const wAdj = weightAdjustment(input.weight, input.tour)
  for (const key of Object.keys(base) as VisibleKey[]) {
    base[key] += (hAdj[key] ?? 0) + (wAdj[key] ?? 0)
  }

  if (input.backhand === "two") {
    base.backhand += 3
  } else {
    base.backhand -= 2
    base.volley   += 3
  }

  function clampToRange(key: VisibleKey, val: number): number {
    const [min, max] = ranges[key]
    return Math.max(min, Math.min(max, Math.round(val)))
  }

  const potential       = Math.round(55 + Math.random() * 30)
  const professionalism = Math.round(40 + Math.random() * 20)
  const durability      = Math.round(50 + Math.random() * 30)
  const adaptability    = Math.round(45 + Math.random() * 30)

  return {
    serve:           clampToRange("serve",    base.serve),
    drive:           clampToRange("drive",    base.drive),
    backhand:        clampToRange("backhand", base.backhand),
    volley:          clampToRange("volley",   base.volley),
    return:          clampToRange("return",   base.return),
    defense:         clampToRange("defense",  base.defense),
    speed:           clampToRange("speed",    base.speed),
    stamina:         clampToRange("stamina",  base.stamina),
    power:           clampToRange("power",    base.power),
    mentality:       clampToRange("mentality",base.mentality),
    potential,
    professionalism,
    durability,
    adaptability,
  }
}

/* -------------------------------------------------------------------------- */
/*  Overall                                                                    */
/* -------------------------------------------------------------------------- */

const STYLE_WEIGHTS: Record<PlayStyle, Partial<Record<VisibleKey, number>>> = {
  "aggressive-baseline": { serve: 1, drive: 1.4, backhand: 1.2, power: 1.3, speed: 1, mentality: 1, stamina: 0.8, volley: 0.6, return: 1, defense: 0.7 },
  "defensive-baseline":  { speed: 1.4, stamina: 1.4, backhand: 1.1, drive: 1.1, mentality: 1.1, serve: 0.8, power: 0.7, volley: 0.6, return: 1.3, defense: 1.4 },
  "serve-volley":        { serve: 1.5, volley: 1.4, power: 1.1, drive: 1, speed: 1, mentality: 1, backhand: 0.7, stamina: 0.8, return: 0.7, defense: 0.8 },
  "all-around":          { serve: 1, drive: 1, backhand: 1, volley: 1, speed: 1, stamina: 1, power: 1, mentality: 1, return: 1, defense: 1 },
}

export function computeOverall(attrs: AttributeSet, style: PlayStyle): number {
  const weights = STYLE_WEIGHTS[style]
  const keys: VisibleKey[] = ["serve","drive","backhand","volley","return","defense","speed","stamina","power","mentality"]
  let total = 0, wSum = 0
  for (const key of keys) {
    const w = weights[key] ?? 1
    total += (attrs[key] ?? 0) * w
    wSum  += w
  }
  return Math.round(total / wSum)
}

/* -------------------------------------------------------------------------- */
/*  Topes dinámicos (rango máximo + cap breakers)                              */
/* -------------------------------------------------------------------------- */

export function computeAttributeCap(
  key: VisibleKey,
  playStyle: PlayStyle,
  height: number,
  weight: number,
  tour: Tour,
  capBreakers: Partial<Record<VisibleKey, number>> = {}
): number {
  const [, baseMax] = STYLE_RANGES[playStyle][key]
  const hAdj = heightAdjustment(height, tour)[key] ?? 0
  const wAdj = weightAdjustment(weight, tour)[key] ?? 0
  const bonus = capBreakers[key] ?? 0
  return Math.min(99, baseMax + hAdj + wAdj + bonus)
}
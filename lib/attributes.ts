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

function clamp(n: number, min = 30, max = 88) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

// Base attributes by play style. These represent a promising young prospect (16-20)
// so overall ratings sit in a realistic "future top-100" range rather than elite.
const STYLE_BASE: Record<PlayStyle, AttributeSet> = {
  "aggressive-baseline": {
    serve: 64,
    forehand: 72,
    backhand: 66,
    volley: 52,
    speed: 62,
    stamina: 60,
    power: 72,
    mentality: 50,
  },
  "defensive-baseline": {
    serve: 56,
    forehand: 64,
    backhand: 66,
    volley: 50,
    speed: 74,
    stamina: 76,
    power: 56,
    mentality: 54,
  },
  "serve-volley": {
    serve: 76,
    forehand: 62,
    backhand: 56,
    volley: 74,
    speed: 64,
    stamina: 58,
    power: 66,
    mentality: 52,
  },
  "all-around": {
    serve: 64,
    forehand: 66,
    backhand: 64,
    volley: 62,
    speed: 64,
    stamina: 64,
    power: 62,
    mentality: 54,
  },
}

export function computeAttributes(input: AttributeInput): AttributeSet {
  const base = { ...STYLE_BASE[input.playStyle] }

  // Height: taller players serve bigger and hit with more power, but lose a bit
  // of speed/agility. Shorter players gain speed.
  const tallRef = input.tour === "WTA" ? 170 : 183
  const heightDelta = input.height - tallRef
  base.serve += heightDelta * 0.45
  base.power += heightDelta * 0.30
  base.speed -= heightDelta * 0.20
  base.stamina -= heightDelta * 0.12

  // Weight relative to a healthy frame for the given height (rough BMI proxy).
  const idealWeight = (input.height - 100) * (input.tour === "WTA" ? 0.85 : 0.92)
  const weightDelta = input.weight - idealWeight
  base.power += weightDelta * 0.3
  base.stamina -= Math.abs(weightDelta) * 0.25
  base.speed -= Math.max(0, weightDelta) * 0.3

  // Age: older within the 16-20 window = a touch more developed & mentally mature.
  const ageDelta = input.age - 16
  base.mentality += ageDelta * 2
  base.stamina += ageDelta * 1.2
  base.power += ageDelta * 0.8

  // Two-handed backhand is more solid; one-hander trades consistency for reach/slice.
  if (input.backhand === "two") {
    base.backhand += 3
  } else {
    base.backhand -= 2
    base.volley += 3
  }

  const result: AttributeSet = {
    serve: clamp(base.serve),
    forehand: clamp(base.forehand),
    backhand: clamp(base.backhand),
    volley: clamp(base.volley),
    speed: clamp(base.speed),
    stamina: clamp(base.stamina),
    power: clamp(base.power),
    mentality: clamp(base.mentality),
  }

  return result
}

const STYLE_WEIGHTS: Record<PlayStyle, Partial<Record<keyof AttributeSet, number>>> = {
  "aggressive-baseline": { serve: 1, forehand: 1.4, backhand: 1.2, power: 1.3, speed: 1, mentality: 1, stamina: 0.8, volley: 0.6 },
  "defensive-baseline": { speed: 1.4, stamina: 1.4, backhand: 1.1, forehand: 1.1, mentality: 1.1, serve: 0.8, power: 0.7, volley: 0.6 },
  "serve-volley": { serve: 1.5, volley: 1.4, power: 1.1, forehand: 1, speed: 1, mentality: 1, backhand: 0.7, stamina: 0.8 },
  "all-around": { serve: 1, forehand: 1, backhand: 1, volley: 1, speed: 1, stamina: 1, power: 1, mentality: 1 },
}

export function computeOverall(attrs: AttributeSet, style: PlayStyle): number {
  const weights = STYLE_WEIGHTS[style]
  let total = 0
  let wSum = 0
  for (const key of Object.keys(attrs) as (keyof AttributeSet)[]) {
    const w = weights[key] ?? 1
    total += attrs[key] * w
    wSum += w
  }
  return Math.round(total / wSum)
}

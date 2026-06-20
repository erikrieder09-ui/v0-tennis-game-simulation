import type { AttributeSet, PlayStyle } from "./types"
import { computeAttributeCap } from "./attributes"
 
export type VisibleKey = "serve" | "drive" | "backhand" | "volley" | "return" | "defense" | "speed" | "stamina" | "power" | "mentality"
 
export const VISIBLE_KEYS: VisibleKey[] = [
  "serve", "drive", "backhand", "volley", "return",
  "defense", "speed", "stamina", "power", "mentality",
]
 
/* -------------------------------------------------------------------------- */
/*  XP y niveles                                                               */
/* -------------------------------------------------------------------------- */
 
/** XP necesaria para pasar del nivel `level` al siguiente */
export function xpForNextLevel(level: number): number {
  return level * 100
}
 
/** Sube de nivel mientras haya XP suficiente. Devuelve { level, xp } */
export function applyXP(
  currentLevel: number,
  currentXP: number,
  gainedXP: number
): { level: number; xp: number; levelsGained: number } {
  let level = currentLevel
  let xp = currentXP + gainedXP
  let levelsGained = 0
 
  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level)
    level++
    levelsGained++
  }
  return { level, xp, levelsGained }
}
 
/** XP ganada por partido */
export const XP_REWARDS = {
  win:      40,
  loss:     20,
  training: 15,
}
 
/* -------------------------------------------------------------------------- */
/*  Costo de subir atributo                                                    */
/* -------------------------------------------------------------------------- */
 
/** Puntos de atributo necesarios para subir 1 punto en `currentValue` */
export function attributeUpgradeCost(currentValue: number): number {
  if (currentValue < 70) return 1
  if (currentValue < 80) return 2
  if (currentValue < 90) return 3
  if (currentValue < 95) return 5
  return 8
}
 
/** Puntos totales otorgados hasta cierto nivel (1 por nivel, +2 extra en múltiplos de 5) */
export function totalPointsForLevel(level: number): number {
  let total = 0
  for (let l = 1; l <= level; l++) {
    total += 1
    if (l % 5 === 0) total += 2
  }
  return total
}

/** Puntos de nivel disponibles para gastar */
export function availableAttributePoints(level: number, spentPoints: number): number {
  return totalPointsForLevel(level) - spentPoints
}
 
/* -------------------------------------------------------------------------- */
/*  Energía                                                                    */
/* -------------------------------------------------------------------------- */
 
export const MAX_ENERGY = 100
export const BOTTLE_COST = 500   // en dinero del juego
 
export const ENERGY_DELTA = {
  match:    -15,
  training: -25,
  rest:     +40,  // al pasar semana
  bottle:   +50,
}
 
export function applyEnergy(current: number, delta: number): number {
  return Math.max(0, Math.min(MAX_ENERGY, current + delta))
}
 
/* -------------------------------------------------------------------------- */
/*  Subir atributo                                                             */
/* -------------------------------------------------------------------------- */
 
interface UpgradeResult {
  success: boolean
  reason?: string
  newAttrs: AttributeSet
  pointsSpent: number
}
 
export function upgradeAttribute(
  attrs: AttributeSet,
  key: VisibleKey,
  availablePoints: number,
  playStyle: PlayStyle,
  height: number,
  weight: number,
  tour: "ATP" | "WTA",
  capBreakers: Partial<Record<VisibleKey, number>>
): UpgradeResult {
  const current = attrs[key] ?? 0
  const cap = computeAttributeCap(key, playStyle, height, weight, tour, capBreakers)
  const cost = attributeUpgradeCost(current)
 
  if (current >= cap) {
    return { success: false, reason: "Atributo en su tope máximo", newAttrs: attrs, pointsSpent: 0 }
  }
  if (availablePoints < cost) {
    return { success: false, reason: `Necesitás ${cost} puntos (tenés ${availablePoints})`, newAttrs: attrs, pointsSpent: 0 }
  }
 
  return {
    success: true,
    newAttrs: { ...attrs, [key]: current + 1 },
    pointsSpent: cost,
  }
}
 
/* -------------------------------------------------------------------------- */
/*  Cap breakers                                                               */
/* -------------------------------------------------------------------------- */
 
export const CAP_BREAKER_BONUS: Record<"masters-1000" | "grand-slam" | "atp-finals", number> = {
  "masters-1000": 1,
  "grand-slam":   3,
  "atp-finals":   3,
}
 
export function applyCapBreaker(
  capBreakers: Partial<Record<VisibleKey, number>>,
  key: VisibleKey,
  bonus: number
): Partial<Record<VisibleKey, number>> {
  return {
    ...capBreakers,
    [key]: (capBreakers[key] ?? 0) + bonus,
  }
}
 
/* -------------------------------------------------------------------------- */
/*  Entrenamiento                                                              */
/* -------------------------------------------------------------------------- */
 
export type TrainingFocus = VisibleKey
 
/** Un bloque de entrenamiento: gasta energía, da XP y sube profesionalismo */
export interface TrainingResult {
  xpGained: number
  energyDelta: number
  professionalismGain: number // acumulativo, cada 3 sesiones +1
}
 
export function doTraining(): TrainingResult {
  return {
    xpGained: XP_REWARDS.training,
    energyDelta: ENERGY_DELTA.training,
    professionalismGain: 1, // el componente acumula y sube cada 3
  }
}
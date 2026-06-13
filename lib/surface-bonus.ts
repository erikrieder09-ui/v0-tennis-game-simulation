import type { PlayStyle, Surface } from "./types"

export function surfaceMultiplier(
  style: PlayStyle,
  surface: Surface
): number {

  if (surface === "grass") {
    if (style === "serve-volley") return 1.10
    if (style === "aggressive-baseline") return 1.05
  }

  if (surface === "clay") {
    if (style === "defensive-baseline") return 1.10
    if (style === "all-around") return 1.04
  }

  if (surface === "hard") {
    if (style === "all-around") return 1.05
  }

  return 1
}
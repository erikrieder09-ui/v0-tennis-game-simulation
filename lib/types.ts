export type Tour = "ATP" | "WTA"

export type Handedness = "right" | "left"

export type Backhand = "one" | "two"

export type PlayStyle = "aggressive-baseline" | "defensive-baseline" | "serve-volley" | "all-around"

export interface AttributeSet {
  serve: number
  forehand: number
  backhand: number
  volley: number
  speed: number
  stamina: number
  power: number
  mentality: number
}

export interface PlayerProfile {
  tour: Tour
  firstName: string
  lastName: string
  nationality: string // ISO code
  handedness: Handedness
  backhand: Backhand
  height: number // cm
  weight: number // kg
  age: number
  playStyle: PlayStyle
  attributes: AttributeSet
}

export type Surface = "hard" | "clay" | "grass"

export type Division = "grand-slam" | "masters" | "tour" | "challenger" | "futures"

export interface Rival {
  id: string
  tour: Tour
  firstName: string
  lastName: string
  nationality: string
  age: number
  handedness: Handedness
  backhand: Backhand
  height: number
  weight: number
  playStyle: PlayStyle
  attributes: AttributeSet
  overall: number
  rank: number
  points: number
  favSurface: Surface
  // 0 (iron man) to 100 (extremely fragile) — tendency to pick up injuries.
  injuryProneness: number
}

export const SURFACE_LABELS: Record<Surface, string> = {
  hard: "Dura",
  clay: "Polvo de ladrillo",
  grass: "Césped",
}

export const PLAY_STYLES: {
  id: PlayStyle
  label: string
  description: string
}[] = [
  {
    id: "aggressive-baseline",
    label: "Agresivo de fondo",
    description: "Dictar con golpes potentes desde la línea de fondo. Busca terminar los puntos rápido.",
  },
  {
    id: "defensive-baseline",
    label: "Defensivo / Contragolpeador",
    description: "Devuelve todo, alarga los puntos y castiga los errores del rival con su físico.",
  },
  {
    id: "serve-volley",
    label: "Saque y volea",
    description: "Sube a la red detrás del saque. Presión constante y puntos cortos.",
  },
  {
    id: "all-around",
    label: "All-around",
    description: "Sin debilidades marcadas. Se adapta a cualquier superficie y rival.",
  },
]

export const ATTRIBUTE_LABELS: { key: keyof AttributeSet; label: string }[] = [
  { key: "serve", label: "Saque" },
  { key: "forehand", label: "Drive" },
  { key: "backhand", label: "Revés" },
  { key: "volley", label: "Volea" },
  { key: "speed", label: "Velocidad" },
  { key: "stamina", label: "Resistencia" },
  { key: "power", label: "Potencia" },
  { key: "mentality", label: "Mentalidad" },
]

// Curated list of nationalities common on tour
export const NATIONALITIES: { code: string; name: string; flag: string }[] = [
  { code: "ARG", name: "Argentina", flag: "🇦🇷" },
  { code: "AUS", name: "Australia", flag: "🇦🇺" },
  { code: "AUT", name: "Austria", flag: "🇦🇹" },
  { code: "BEL", name: "Bélgica", flag: "🇧🇪" },
  { code: "BRA", name: "Brasil", flag: "🇧🇷" },
  { code: "BUL", name: "Bulgaria", flag: "🇧🇬" },
  { code: "CAN", name: "Canadá", flag: "🇨🇦" },
  { code: "CHI", name: "Chile", flag: "🇨🇱" },
  { code: "CHN", name: "China", flag: "🇨🇳" },
  { code: "COL", name: "Colombia", flag: "🇨🇴" },
  { code: "CRO", name: "Croacia", flag: "🇭🇷" },
  { code: "CZE", name: "Chequia", flag: "🇨🇿" },
  { code: "DEN", name: "Dinamarca", flag: "🇩🇰" },
  { code: "ESP", name: "España", flag: "🇪🇸" },
  { code: "USA", name: "Estados Unidos", flag: "🇺🇸" },
  { code: "FRA", name: "Francia", flag: "🇫🇷" },
  { code: "GBR", name: "Gran Bretaña", flag: "🇬🇧" },
  { code: "GRE", name: "Grecia", flag: "🇬🇷" },
  { code: "NED", name: "Países Bajos", flag: "🇳🇱" },
  { code: "HUN", name: "Hungría", flag: "🇭🇺" },
  { code: "ITA", name: "Italia", flag: "🇮🇹" },
  { code: "JPN", name: "Japón", flag: "🇯🇵" },
  { code: "KAZ", name: "Kazajistán", flag: "🇰🇿" },
  { code: "MEX", name: "México", flag: "🇲🇽" },
  { code: "NOR", name: "Noruega", flag: "🇳🇴" },
  { code: "POL", name: "Polonia", flag: "🇵🇱" },
  { code: "POR", name: "Portugal", flag: "🇵🇹" },
  { code: "RUS", name: "Rusia", flag: "🇷🇺" },
  { code: "SRB", name: "Serbia", flag: "🇷🇸" },
  { code: "SUI", name: "Suiza", flag: "🇨🇭" },
  { code: "GER", name: "Alemania", flag: "🇩🇪" },
  { code: "URU", name: "Uruguay", flag: "🇺🇾" },
]

export function getNationality(code: string) {
  return NATIONALITIES.find((n) => n.code === code)
}

"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  createCareer, buildLiveRanking, getPlayerRank, addWeeks, formatDate, formatMoney,
  addPointsEntry, recomputePoints, checkAnnualProgression,
  type CareerState, type PointsEntry,
} from "@/lib/career"
import { upcomingTournaments, entryStatus, CATEGORY_INFO, pointsForResult, prizeForResult, getTournamentsOnDate, CATEGORY_PRIORITY, type Tournament } from "@/lib/calendar"
import { getRankings, evolveRoster } from "@/lib/rivals"
import { simulateFullMatch, createMatchState, playPoint, playGame, playSet, formatMatchScore, type MatchState, type MatchConfig } from "@/lib/match-engine"
import type { PlayerProfile, Rival } from "@/lib/types"
import { ATTRIBUTE_LABELS } from "@/lib/types"
import {
  applyXP, XP_REWARDS, ENERGY_DELTA, applyEnergy, BOTTLE_COST,
  VISIBLE_KEYS, VisibleKey, xpForNextLevel, attributeUpgradeCost,
  availableAttributePoints, upgradeAttribute,
} from "@/lib/progression"
import { computeAttributeCap, computeOverall } from "@/lib/attributes"
import {
  initDavisCup, simulateDavisSeries, advanceDavisRound,
  checkUserInvitation, isDavisRoundPlayable, type DavisCupState, type DavisSeries,
} from "@/lib/davis-cup"





/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const SURFACE_LABEL: Record<string, string> = {
  hard: "Dura", clay: "Polvo de ladrillo", grass: "Césped", carpet: "Indoor"
}
const SURFACE_COLOR: Record<string, string> = {
  hard: "bg-blue-900/40 text-blue-300 border-blue-700",
  clay: "bg-orange-900/40 text-orange-300 border-orange-700",
  grass: "bg-green-900/40 text-green-300 border-green-700",
  carpet: "bg-zinc-800 text-zinc-300 border-zinc-600",
}
const CAT_COLOR: Record<string, string> = {
  "grand-slam": "bg-yellow-500/20 text-yellow-300 border-yellow-600",
  "masters-1000": "bg-purple-500/20 text-purple-300 border-purple-600",
  "atp-500": "bg-blue-500/20 text-blue-300 border-blue-600",
  "atp-250": "bg-zinc-700 text-zinc-300 border-zinc-600",
  "challenger": "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  "futures": "bg-zinc-800 text-zinc-400 border-zinc-700",
}


function surfaceBadge(surface: string) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${SURFACE_COLOR[surface] ?? "bg-zinc-800 text-zinc-400 border-zinc-600"}`}>
      {SURFACE_LABEL[surface] ?? surface}
    </span>
  )
}

function catBadge(cat: string) {
  const info = CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO]
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${CAT_COLOR[cat] ?? "bg-zinc-800 text-zinc-400"}`}>
      {info?.label ?? cat}
    </span>
  )
}

/**
 * Dado un torneo y el pool completo de rivales, devuelve los rivales
 * que realmente participarían en ese torneo, respetando simultaneidad
 * y probabilidades realistas de participación según ranking/superficie.
 */
function getEligibleRivalsForTournament(
  t: Tournament,
  allRivals: Rival[],
  allTournamentsThisWeek: Tournament[]
): Rival[] {
  function hashStr(s: string): number {
    let h = 0
    for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
    return Math.abs(h)
  }

  const sortedTournaments = [...allTournamentsThisWeek].sort(
    (a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category] || a.id.localeCompare(b.id)
  )

  const assignedTo: Record<string, string> = {}

  for (const tournament of sortedTournaments) {
    const sameCatTournaments = sortedTournaments.filter(t2 => t2.category === tournament.category)
    const tournamentIndex = sameCatTournaments.findIndex(t2 => t2.id === tournament.id)

    for (const rival of allRivals) {
      if (assignedTo[rival.id]) continue

      if (sameCatTournaments.length > 1) {
        // Múltiples torneos de la misma categoría: distribuir por hash
        const rivalHash = hashStr(`${rival.id}-${t.date}`)
        const assignedIndex = rivalHash % sameCatTournaments.length
        if (assignedIndex !== tournamentIndex) continue

        // Top players pueden saltarse torneos opcionales
        const cat = tournament.category
        if (cat === "atp-500" || cat === "atp-250") {
          const skipProb = rival.rank <= 5 ? 0.55
            : rival.rank <= 10 ? 0.40
            : rival.rank <= 20 ? 0.25
            : 0.05
          const skipHash = hashStr(`skip-${tournament.id}-${rival.id}`)
          if ((skipHash % 1000) / 1000 < skipProb) continue
        }
        assignedTo[rival.id] = tournament.id
      } else {
        // Torneo único esta semana
        const cat = tournament.category
        let prob = 0.8

        if (cat === "grand-slam" || cat === "masters-1000") {
          prob = rival.rank <= 30 ? 0.95 : rival.rank <= 60 ? 0.85 : 0.70
        } else if (cat === "atp-500") {
          // Top 5 raramente juegan un 500 si no es su torneo favorito
          prob = rival.rank <= 5 ? 0.25
            : rival.rank <= 10 ? 0.45
            : rival.rank <= 20 ? 0.65
            : rival.rank <= 50 ? 0.85
            : 0.92
          if (rival.favSurface === tournament.surface) prob = Math.min(1, prob + 0.20)
        } else if (cat === "atp-250") {
          // Top 10 casi nunca juegan 250s salvo que sea su torneo favorito
          prob = rival.rank <= 5 ? 0.08
            : rival.rank <= 10 ? 0.15
            : rival.rank <= 20 ? 0.30
            : rival.rank <= 50 ? 0.65
            : rival.rank <= 100 ? 0.85
            : 0.92
          if (rival.favSurface === tournament.surface) prob = Math.min(1, prob + 0.15)
        } else if (cat === "challenger") {
          prob = rival.rank <= 50 ? 0.03
            : rival.rank <= 80 ? 0.15
            : rival.rank <= 120 ? 0.60
            : 0.88
        } else if (cat === "futures") {
          prob = rival.rank <= 100 ? 0.01
            : rival.rank <= 150 ? 0.15
            : 0.82
        }

        const seed = hashStr(`${tournament.id}-${rival.id}`)
        if ((seed % 1000) / 1000 < prob) assignedTo[rival.id] = tournament.id
      }
    }
  }

  let assigned = allRivals.filter(r => assignedTo[r.id] === t.id)

  // Rango apropiado para el fallback
  const rankRange: [number, number] =
    t.category === "grand-slam" ? [1, 200] :
    t.category === "masters-1000" ? [1, 100] :
    t.category === "atp-500" ? [5, 80] :
    t.category === "atp-250" ? [20, 150] :
    t.category === "challenger" ? [60, 249] :
    t.category === "futures" ? [120, 249] :
    [1, 249]

  const needed = CATEGORY_INFO[t.category].drawSize + 10
  if (assigned.length < needed) {
    const unassigned = allRivals.filter(r =>
      !assignedTo[r.id] &&
      r.rank >= rankRange[0] &&
      r.rank <= rankRange[1]
    ).sort((a, b) => a.rank - b.rank)
    assigned = [...assigned, ...unassigned.slice(0, needed - assigned.length)]
  }

  if (assigned.length < CATEGORY_INFO[t.category].drawSize) {
    const assignedIds = new Set(assigned.map(r => r.id))
    const remaining = allRivals
      .filter(r => !assignedIds.has(r.id) && r.rank >= rankRange[0])
      .sort((a, b) => a.rank - b.rank)
    assigned = [...assigned, ...remaining]
  }

  return assigned
}

/* -------------------------------------------------------------------------- */
/*  Draw generator (simple bracket)                                            */
/* -------------------------------------------------------------------------- */

interface DrawMatch {
  id: string
  round: number
  position: number
  p1: Rival | null
  p2: Rival | null
  winner: Rival | null
  score: string | null
  isUser: boolean
  group?: "A" | "B"
  phase?: "group" | "semifinal" | "final"
}

/**
 * Calcula puntos de torneo para cada participante según hasta qué ronda llegó,
 * usando una escala proporcional a winnerPoints de la categoría.
 */
function computeTournamentPointsBonus(
  matches: DrawMatch[],
  category: Tournament["category"],
  existingHistory: Record<string, PointsEntry[]>,
  currentDate: string
): Record<string, PointsEntry[]> {
  const winnerPoints = CATEGORY_INFO[category].winnerPoints
  const maxRound = Math.max(...matches.map(m => m.round))
  const updated = { ...existingHistory }

  matches.forEach(m => {
    if (!m.winner) return
    const loser = m.winner.id === m.p1?.id ? m.p2 : m.p1
    if (loser && loser.id !== "USER") {
      const roundFraction = (m.round + 1) / (maxRound + 2)
      const pts = Math.round(winnerPoints * roundFraction * 0.5)
      updated[loser.id] = addPointsEntry(updated[loser.id] ?? [], pts, currentDate, category)
    }
    if (m.round === maxRound && m.winner.id !== "USER") {
      updated[m.winner.id] = addPointsEntry(updated[m.winner.id] ?? [], winnerPoints, currentDate, category)
    }
  })

  return updated
}

function updateRivalPalmares(
  matches: DrawMatch[],
  tournamentName: string,
  existingPalmares: Record<string, string[]>
): Record<string, string[]> {
  const maxRound = Math.max(...matches.map(m => m.round))
  const finalMatch = matches.find(m => m.round === maxRound)
  if (!finalMatch?.winner || finalMatch.winner.id === "USER") return existingPalmares

  const winnerId = finalMatch.winner.id
  const updated = { ...existingPalmares }
  updated[winnerId] = [...(updated[winnerId] ?? []), tournamentName]
  return updated
}

function buildDraw(
  t: Tournament,
  rivals: Rival[],
  userRival: Rival,
  isDirect: boolean,
  overrideDrawSize?: number
): DrawMatch[] {
  const info = CATEGORY_INFO[t.category]
  const size = overrideDrawSize ?? info.drawSize

  const pool = rivals
    .filter(r => r.id !== "USER")
    .sort((a, b) => a.rank - b.rank)

  const slotsForRivals = size - (isDirect ? 1 : 0)
  const field = pool.slice(0, slotsForRivals)

  const seeded = field.slice(0, 8)
  const unseeded = field.slice(8)

  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]]
  }

  const slots: (Rival | null)[] = new Array(size).fill(null)
  const seedPos = [
    0, size - 1,
    Math.floor(size / 2) - 1, Math.floor(size / 2),
    Math.floor(size / 4) - 1, Math.floor(size * 3 / 4),
    Math.floor(size / 4), Math.floor(size * 3 / 4) - 1,
  ]
  seeded.forEach((s, i) => { if (seedPos[i] !== undefined) slots[seedPos[i]] = s })

  const toPlace = isDirect ? [...unseeded, userRival] : unseeded

  for (let i = toPlace.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[toPlace[i], toPlace[j]] = [toPlace[j], toPlace[i]]
  }

  let pi = 0
  for (let i = 0; i < slots.length; i++) {
    if (!slots[i]) slots[i] = toPlace[pi++] ?? null
  }

  const matches: DrawMatch[] = []
  for (let i = 0; i < size / 2; i++) {
    const p1 = slots[i * 2]
    const p2 = slots[i * 2 + 1]
    matches.push({
      id: `r0-${i}`,
      round: 0,
      position: i,
      p1, p2,
      winner: null,
      score: null,
      isUser: p1?.id === "USER" || p2?.id === "USER",
    })
  }
  return matches
}

function simNonUserMatches(
  matches: DrawMatch[],
  surface: string,
  bestOf: 3 | 5
): DrawMatch[] {
  return matches.map(m => {
    if (m.isUser || m.winner || !m.p1 || !m.p2) return m
    const config: MatchConfig = {
      player1: m.p1, player2: m.p2,
      surface: surface as any,
      bestOf: bestOf, finalSetTiebreak: true, finalSetTiebreakAt: 10,
    }
    const result = simulateFullMatch(config)
    const w = result.winner === 1 ? m.p1 : m.p2
    return { ...m, winner: w, score: formatMatchScore(result, 1) }
  })
}

function advanceDraw(
  matches: DrawMatch[],
  surface: string,
  bestOf: 3 | 5
): DrawMatch[] {
  const maxRound = Math.max(...matches.map(m => m.round))
  const roundMatches = matches.filter(m => m.round === maxRound && m.winner)
  if (roundMatches.length < 2) return matches

  const next: DrawMatch[] = []
  for (let i = 0; i < roundMatches.length; i += 2) {
    const m1 = roundMatches[i]
    const m2 = roundMatches[i + 1]
    if (!m1 || !m2) continue
    const p1 = m1.winner
    const p2 = m2?.winner ?? null
    const isUser = p1?.id === "USER" || p2?.id === "USER"
    next.push({
      id: `r${maxRound + 1}-${i / 2}`,
      round: maxRound + 1,
      position: i / 2,
      p1, p2,
      winner: null,
      score: null,
      isUser,
    })
  }

  const simmed = next.map(m => {
    if (m.isUser || !m.p1 || !m.p2) return m
    const config: MatchConfig = {
      player1: m.p1, player2: m.p2,
      surface: surface as any,
      bestOf: bestOf, finalSetTiebreak: true, finalSetTiebreakAt: 10,
    }
    const result = simulateFullMatch(config)
    return { ...m, winner: result.winner === 1 ? m.p1 : m.p2, score: formatMatchScore(result, 1) }
  })

  return [...matches, ...simmed]
}

/** Simula rondas completas hasta llegar al campeón (o hasta el límite de seguridad). */
function simulateToChampion(
  matches: DrawMatch[],
  surface: string,
  bestOf: 3 | 5
): DrawMatch[] {
  let current = matches
  let guard = 0
  while (guard < 10) {
    const maxR = Math.max(...current.map(m => m.round))
    const roundMatches = current.filter(m => m.round === maxR)
    if (roundMatches.length <= 1 && roundMatches[0]?.winner) break

    const allDecided = roundMatches.every(m => m.winner)
    if (!allDecided) {
      current = simNonUserMatches(current, surface, bestOf)
    } else {
      current = advanceDraw(current, surface, bestOf)
    }
    guard++
  }
  return current
}
/* -------------------------------------------------------------------------- */
/*  ATP Finals — Round Robin + Knockout                                        */
/* -------------------------------------------------------------------------- */

const ROUND_ROBIN_PAIRINGS: [number, number][][] = [
  [[0, 3], [1, 2]],
  [[0, 2], [3, 1]],
  [[0, 1], [2, 3]],
]

function buildRoundRobinDraw(
  rivals: Rival[],
  userRival: Rival,
  isDirect: boolean
): DrawMatch[] {
  const field: Rival[] = isDirect
    ? [...rivals.slice(0, 7), userRival].sort((a, b) => a.rank - b.rank)
    : rivals.slice(0, 8)

  const groupA: (Rival | null)[] = [field[0] ?? null, field[3] ?? null, field[4] ?? null, field[7] ?? null]
  const groupB: (Rival | null)[] = [field[1] ?? null, field[2] ?? null, field[5] ?? null, field[6] ?? null]

  const matches: DrawMatch[] = []
  let counter = 0

  for (let round = 0; round < 3; round++) {
    const roundPairs = ROUND_ROBIN_PAIRINGS[round]
    ;([
      { group: "A" as const, players: groupA },
      { group: "B" as const, players: groupB },
    ]).forEach(({ group, players }) => {
      roundPairs.forEach(([i, j]) => {
        const p1 = players[i]
        const p2 = players[j]
        matches.push({
          id: `rr-${group}-${round}-${counter++}`,
          round,
          position: counter,
          p1: p1 ?? null,
          p2: p2 ?? null,
          winner: null,
          score: null,
          isUser: p1?.id === "USER" || p2?.id === "USER",
          group,
          phase: "group",
        })
      })
    })
  }

  return matches
}

interface GroupStanding {
  rival: Rival
  wins: number
  losses: number
  setsWon: number
  setsLost: number
}

function computeGroupStandings(matches: DrawMatch[], group: "A" | "B"): GroupStanding[] {
  const groupMatches = matches.filter(m => m.group === group && m.phase === "group")
  const standings: Record<string, GroupStanding> = {}

  groupMatches.forEach(m => {
    if (m.p1 && !standings[m.p1.id]) standings[m.p1.id] = { rival: m.p1, wins: 0, losses: 0, setsWon: 0, setsLost: 0 }
    if (m.p2 && !standings[m.p2.id]) standings[m.p2.id] = { rival: m.p2, wins: 0, losses: 0, setsWon: 0, setsLost: 0 }
  })

  groupMatches.forEach(m => {
    if (!m.winner || !m.p1 || !m.p2) return
    const loserId = m.winner.id === m.p1.id ? m.p2.id : m.p1.id
    standings[m.winner.id].wins++
    standings[loserId].losses++

    if (m.score) {
      const sets = m.score.trim().split(" ")
      sets.forEach(s => {
        const clean = s.replace(/\(.*\)/, "")
        const [a, b] = clean.split("-").map(Number)
        if (!isNaN(a) && !isNaN(b)) {
          if (a > b) {
            standings[m.p1!.id].setsWon++
            standings[m.p2!.id].setsLost++
          } else {
            standings[m.p2!.id].setsWon++
            standings[m.p1!.id].setsLost++
          }
        }
      })
    }
  })

  return Object.values(standings).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return (b.setsWon - b.setsLost) - (a.setsWon - a.setsLost)
  })
}

function advanceFromGroupStage(matches: DrawMatch[], surface: string, bestOf: 3 | 5): DrawMatch[] {
  const groupMatches = matches.filter(m => m.phase === "group")
  const allDecided = groupMatches.every(m => m.winner)
  if (!allDecided) return matches
  if (matches.some(m => m.phase === "semifinal")) return matches

  const standingsA = computeGroupStandings(matches, "A")
  const standingsB = computeGroupStandings(matches, "B")

  const a1 = standingsA[0]?.rival ?? null
  const a2 = standingsA[1]?.rival ?? null
  const b1 = standingsB[0]?.rival ?? null
  const b2 = standingsB[1]?.rival ?? null

  const sf1: DrawMatch = {
    id: "atpf-sf1", round: 3, position: 0,
    p1: a1, p2: b2, winner: null, score: null,
    isUser: a1?.id === "USER" || b2?.id === "USER",
    phase: "semifinal",
  }
  const sf2: DrawMatch = {
    id: "atpf-sf2", round: 3, position: 1,
    p1: b1, p2: a2, winner: null, score: null,
    isUser: b1?.id === "USER" || a2?.id === "USER",
    phase: "semifinal",
  }

  let updated = [...matches, sf1, sf2]
  updated = simNonUserMatches(updated, surface, bestOf)
  return updated
}

function advanceFromSemifinals(matches: DrawMatch[], surface: string, bestOf: 3 | 5): DrawMatch[] {
  const semis = matches.filter(m => m.phase === "semifinal")
  if (semis.length < 2 || !semis.every(m => m.winner)) return matches
  if (matches.some(m => m.phase === "final")) return matches

  const final: DrawMatch = {
    id: "atpf-final", round: 4, position: 0,
    p1: semis[0].winner, p2: semis[1].winner, winner: null, score: null,
    isUser: semis[0].winner?.id === "USER" || semis[1].winner?.id === "USER",
    phase: "final",
  }

  let updated = [...matches, final]
  updated = simNonUserMatches(updated, surface, bestOf)
  return updated
}

function simulateRoundRobinToChampion(matches: DrawMatch[], surface: string, bestOf: 3 | 5): DrawMatch[] {
  let current = simNonUserMatches(matches, surface, bestOf)
  let guard = 0
  while (guard < 10) {
    const final = current.find(m => m.phase === "final")
    if (final?.winner) break

    const beforeLength = current.length
    current = advanceFromGroupStage(current, surface, bestOf)
    current = advanceFromSemifinals(current, surface, bestOf)

    if (current.length === beforeLength) {
      const pending = current.some(m => !m.winner)
      if (!pending) break
      current = simNonUserMatches(current, surface, bestOf)
    }
    guard++
  }
  return current
}

/* -------------------------------------------------------------------------- */
/*  Match Sim UI                                                               */
/* -------------------------------------------------------------------------- */

function MatchSimUI({ config, userIs, onEnd }: {
  config: MatchConfig
  userIs: 1 | 2
  onEnd: (state: MatchState) => void
}) {
  const [state, setState] = useState<MatchState>(() => createMatchState(config))
  const [log, setLog] = useState<string[]>(["El partido está por comenzar..."])
  const [simming, setSimming] = useState(false)
  const [autoSimulate, setAutoSimulate] = useState<boolean | null>(null)

  const POINT_LABELS = ["0", "15", "30", "40"]
  const g = state.currentGame
  let s1 = state.isTiebreak ? String(state.tiebreakPoints.p1) : (g.deuce ? "40" : POINT_LABELS[g.p1] ?? "0")
  let s2 = state.isTiebreak ? String(state.tiebreakPoints.p2) : (g.deuce ? "40" : POINT_LABELS[g.p2] ?? "0")
  if (g.advantage === 1) { s1 = "Adv"; s2 = "40" }
  if (g.advantage === 2) { s1 = "40"; s2 = "Adv" }

  const p1 = config.player1
  const p2 = config.player2

  function addLog(msg: string) {
    setLog(prev => [...prev.slice(-30), msg])
  }

  function doPoint() {
    if (state.over) return
    const { state: ns, event } = playPoint(state)
    setState(ns)
    addLog(event.description)
    if (ns.over) onEnd(ns)
  }

  async function doGame() {
    if (state.over || simming) return
    setSimming(true)
    const startG = state.stats.gamesWon[0] + state.stats.gamesWon[1]
    let s = state
    const msgs: string[] = []
    while (!s.over) {
      const { state: ns, event } = playPoint(s)
      msgs.push(event.description)
      s = ns
      if (s.stats.gamesWon[0] + s.stats.gamesWon[1] > startG) break
    }
    setState(s)
    msgs.forEach(m => addLog(m))
    setSimming(false)
    if (s.over) onEnd(s)
  }

  async function doSet() {
    if (state.over || simming) return
    setSimming(true)
    const startS = state.sets.length
    let s = state
    const msgs: string[] = []
    while (!s.over && s.sets.length === startS) {
      const { state: ns, event } = playPoint(s)
      msgs.push(event.description)
      s = ns
    }
    setState(s)
    msgs.forEach(m => addLog(m))
    setSimming(false)
    if (s.over) onEnd(s)
  }

  function doFast() {
    const final = simulateFullMatch(config)
    setState(final)
    setLog([`Resultado rápido: ${formatMatchScore(final, userIs)}`])
    onEnd(final)
  }

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
        {[{ p: p1, idx: 1 as const }, { p: p2, idx: 2 as const }].map(({ p, idx }) => {
          const isUser = idx === userIs
          const serving = state.serving === idx
          return (
            <div key={idx} className={`flex items-center gap-3 px-4 py-3 border-b border-zinc-800 last:border-0 ${isUser ? "bg-yellow-500/5" : ""}`}>
              <span className="w-4 text-center text-xs">{serving ? "🎾" : ""}</span>
              <span className={`flex-1 text-sm font-semibold ${isUser ? "text-yellow-300" : "text-zinc-200"}`}>
                {p.firstName} {p.lastName}
              </span>
              <span className="text-xs text-zinc-500 mr-2">{p.nationality}</span>
              {state.sets.map((set, i) => {
                const sc = idx === 1 ? set.p1 : set.p2
                const op = idx === 1 ? set.p2 : set.p1
                return (
                  <span key={i} className={`w-5 text-center font-mono text-sm ${sc > op ? "text-white font-bold" : "text-zinc-500"}`}>
                    {sc}
                  </span>
                )
              })}
              <span className="w-6 text-center font-mono text-sm text-zinc-400">
                {idx === 1 ? state.currentSet.p1 : state.currentSet.p2}
              </span>
              <span className={`w-10 text-center font-bold text-sm ${state.isTiebreak ? "text-yellow-300" : "text-white"}`}>
                {idx === 1 ? s1 : s2}
              </span>
            </div>
          )
        })}
      </div>

      {/* Controls */}
      {!state.over && (
        <div className="grid grid-cols-2 gap-2">
          <Button className="col-span-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold" onClick={doPoint} disabled={simming}>
            ▶ Jugar punto
          </Button>
          <Button variant="outline" onClick={doGame} disabled={simming}>▶▶ Juego</Button>
          <Button variant="outline" onClick={doSet} disabled={simming}>⏩ Set</Button>
          <Button variant="ghost" className="col-span-2 text-zinc-400" onClick={doFast}>⚡ Simular rápido</Button>
        </div>
      )}

      {/* Result banner */}
      {state.over && (
        <div className={`rounded-xl p-4 text-center border ${state.winner === userIs ? "bg-green-900/30 border-green-700" : "bg-red-900/30 border-red-700"}`}>
          <div className="text-lg font-bold">{state.winner === userIs ? "🏆 ¡Victoria!" : "😔 Derrota"}</div>
          <div className="text-sm text-zinc-300 mt-1">{formatMatchScore(state, userIs)}</div>
        </div>
      )}

      {/* Log */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-36 overflow-y-auto text-xs space-y-1">
        {log.map((l, i) => <div key={i} className="text-zinc-400">{l}</div>)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs text-center">
        {[
          ["Puntos", state.stats.pointsWon],
          ["Aces", state.stats.aces],
          ["Errores", state.stats.unforcedErrors],
        ].map(([label, vals]) => (
          <div key={label as string} className="bg-zinc-900 border border-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-1">{label as string}</div>
            <div className="flex justify-between font-mono font-bold">
              <span className="text-yellow-300">{(vals as number[])[0]}</span>
              <span className="text-zinc-500">—</span>
              <span className="text-zinc-300">{(vals as number[])[1]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Draw viewer                                                                */
/* -------------------------------------------------------------------------- */

function DrawViewer({ matches, onUserMatchClick }: { matches: DrawMatch[], onUserMatchClick: (m: DrawMatch) => void }) {
  const isRoundRobin = matches.some(m => m.phase === "group")

  if (isRoundRobin) {
    const groupAMatches = matches.filter(m => m.group === "A" && m.phase === "group")
    const groupBMatches = matches.filter(m => m.group === "B" && m.phase === "group")
    const semis = matches.filter(m => m.phase === "semifinal")
    const final = matches.filter(m => m.phase === "final")

    const MatchCard = ({ m }: { m: DrawMatch }) => (
      <div
        className={`border rounded-lg overflow-hidden w-44 text-xs
          ${m.isUser ? "border-yellow-500/60 bg-yellow-500/5 cursor-pointer hover:border-yellow-400" : "border-zinc-700 bg-zinc-900"}
          ${m.winner ? "opacity-90" : ""}
        `}
        onClick={m.isUser && !m.winner ? () => onUserMatchClick(m) : undefined}
      >
        {[{ rival: m.p1, w: m.winner?.id === m.p1?.id }, { rival: m.p2, w: m.winner?.id === m.p2?.id }].map(({ rival, w }, i) => (
          <div key={i} className={`flex items-center gap-1 px-2 py-1.5 ${i === 0 ? "border-b border-zinc-800" : ""} ${rival?.id === "USER" ? "text-yellow-300" : w ? "text-white font-semibold" : "text-zinc-400"}`}>
            <span className="w-4 text-zinc-600 text-[10px]">{rival?.rank ?? "—"}</span>
            <span className="flex-1 truncate">{rival ? `${rival.firstName[0]}. ${rival.lastName}` : "TBD"}</span>
          </div>
        ))}
        {m.score && <div className="px-2 py-0.5 text-[10px] text-zinc-500 border-t border-zinc-800">{m.score}</div>}
        {m.isUser && !m.winner && <div className="px-2 py-1 text-[10px] text-yellow-400 border-t border-yellow-500/30">▶ Jugar partido</div>}
      </div>
    )

    const rounds = [0, 1, 2]

    return (
      <div className="space-y-6">
        {/* Fase de grupos */}
        <div className="grid grid-cols-2 gap-6">
          {(["A", "B"] as const).map(group => {
            const gMatches = group === "A" ? groupAMatches : groupBMatches
            return (
              <div key={group}>
                <div className="text-xs font-bold text-zinc-400 mb-3">GRUPO {group}</div>
                <div className="space-y-4">
                  {rounds.map(r => {
                    const rMatches = gMatches.filter(m => m.round === r)
                    return (
                      <div key={r}>
                        <div className="text-[10px] text-zinc-600 mb-1">Jornada {r + 1}</div>
                        <div className="flex flex-col gap-2">
                          {rMatches.map(m => <MatchCard key={m.id} m={m} />)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Semifinales y Final */}
        {(semis.length > 0 || final.length > 0) && (
          <div>
            <div className="text-xs font-bold text-zinc-400 mb-3">FASE FINAL</div>
            <div className="flex gap-6 overflow-x-auto pb-2">
              {semis.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">Semifinales</div>
                  <div className="flex flex-col gap-2">
                    {semis.map(m => <MatchCard key={m.id} m={m} />)}
                  </div>
                </div>
              )}
              {final.length > 0 && (
                <div>
                  <div className="text-[10px] text-zinc-600 mb-1">Final</div>
                  <div className="flex flex-col gap-2">
                    {final.map(m => <MatchCard key={m.id} m={m} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const rounds = Array.from(new Set(matches.map(m => m.round))).sort((a, b) => a - b)
  const roundLabels = ["1ª Ronda", "2ª Ronda", "3ª Ronda", "4ª Ronda", "Cuartos", "Semifinal", "Final"]

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {rounds.map(r => {
          const roundMatches = matches.filter(m => m.round === r)
          return (
            <div key={r} className="flex flex-col gap-2">
              <div className="text-xs font-bold text-zinc-400 text-center mb-1 w-40">
                {roundLabels[r] ?? `Ronda ${r + 1}`}
              </div>
              {roundMatches.map(m => (
                <div
                  key={m.id}
                  className={`border rounded-lg overflow-hidden w-40 text-xs
                    ${m.isUser ? "border-yellow-500/60 bg-yellow-500/5 cursor-pointer hover:border-yellow-400" : "border-zinc-700 bg-zinc-900"}
                    ${m.winner ? "opacity-90" : ""}
                  `}
                  onClick={m.isUser && !m.winner ? () => onUserMatchClick(m) : undefined}
                >
                  {[{ rival: m.p1, w: m.winner?.id === m.p1?.id }, { rival: m.p2, w: m.winner?.id === m.p2?.id }].map(({ rival, w }, i) => (
                    <div key={i} className={`flex items-center gap-1 px-2 py-1.5 ${i === 0 ? "border-b border-zinc-800" : ""} ${rival?.id === "USER" ? "text-yellow-300" : w ? "text-white font-semibold" : "text-zinc-400"}`}>
                      <span className="w-4 text-zinc-600 text-[10px]">{rival?.rank ?? "—"}</span>
                      <span className="flex-1 truncate">{rival ? `${rival.firstName[0]}. ${rival.lastName}` : "TBD"}</span>
                    </div>
                  ))}
                  {m.score && <div className="px-2 py-0.5 text-[10px] text-zinc-500 border-t border-zinc-800">{m.score}</div>}
                  {m.isUser && !m.winner && <div className="px-2 py-1 text-[10px] text-yellow-400 border-t border-yellow-500/30">▶ Jugar partido</div>}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Main CareerHub component                                                   */
/* -------------------------------------------------------------------------- */

interface Props {
  player: PlayerProfile
}

type View = "hub" | "calendar" | "tournament" | "draw" | "match" | "ranking" | "training" | "retire" | "retired" | "davis" | "davis-match"  

export function CareerHub({ player }: Props) {
  const [career, setCareer] = useState<CareerState>(() => createCareer(player))
  const [view, setView] = useState<View>("hub")
  const [selectedT, setSelectedT] = useState<Tournament | null>(null)
  const [drawMatches, setDrawMatches] = useState<DrawMatch[]>([])
  const [activeMatch, setActiveMatch] = useState<{ config: MatchConfig; userIs: 1 | 2; drawMatchId: string } | null>(null)
  const [matchResult, setMatchResult] = useState<string | null>(null)
  const [playingQualy, setPlayingQualy] = useState(false)
  const [playedTournaments, setPlayedTournaments] = useState<Set<string>>(new Set())
  const [qualyCompleted, setQualyCompleted] = useState(false)
  const [autoSimulate, setAutoSimulate] = useState<boolean | null>(null)
  const [selectedRival, setSelectedRival] = useState<Rival | null>(null)
  const [seasonSummary, setSeasonSummary] = useState<CareerState["seasonStats"] | null>(null)
  const [activeDavisSeries, setActiveDavisSeries] = useState<DavisSeries | null>(null)
const [activeDavisMatchType, setActiveDavisMatchType] = useState<string | null>(null)

  const rivals = useMemo(() => getRankings(career.player.tour, career.date), [career.player.tour, career.date])
  const playerRank = getPlayerRank(career)

  const userRival: Rival = {
    id: "USER",
    tour: career.player.tour,
    firstName: career.player.firstName,
    lastName: career.player.lastName,
    nationality: career.player.nationality,
    age: career.player.age,
    handedness: career.player.handedness,
    backhand: career.player.backhand,
    height: career.player.height,
    weight: career.player.weight,
    playStyle: career.player.playStyle,
    attributes: career.player.attributes,
    overall: Math.round(Object.values(career.player.attributes).reduce((a, b) => a + b, 0) / Object.keys(career.player.attributes).length),
    rank: playerRank,
    points: career.points,
    favSurface: "hard",
    injuryProneness: 20,
    currentAbility: Math.round(Object.values(career.player.attributes).reduce((a, b) => a + b, 0) / Object.keys(career.player.attributes).length),
    potentialAbility: Math.round(Object.values(career.player.attributes).reduce((a, b) => a + b, 0) / Object.keys(career.player.attributes).length) + 10,
    retirementDate: null,
  }

  const upcoming = upcomingTournaments(career.date)
    .filter(t => !playedTournaments.has(t.id))
    .slice(0, 12)

  function enterTournament(t: Tournament) {
    const status = entryStatus(t.category, playerRank)
    const bestOf = CATEGORY_INFO[t.category].bestOf

    // Si ya jugamos/simulamos este torneo antes, mostramos el resultado guardado
  if (career.tournamentResults[t.id]) {
    setSelectedT(t)
    setDrawMatches(career.tournamentResults[t.id])
    setMatchResult(null)
    setPlayingQualy(false)
    setQualyCompleted(false)
    setAutoSimulate(false)
    setView("draw")
    return
  }

    if (status.kind === "ineligible") {
 const allRivals = buildLiveRanking(career.player.tour, career.points, career.player, career.rivalBonusHistory, career.date)
  const allNonUserRivals = allRivals.filter(r => !r.isUser) as Rival[]
  const tournamentsThisWeek = getTournamentsOnDate(t.date)
  const rivsForDraw = t.category === "atp-finals"
    ? allNonUserRivals.sort((a, b) => a.rank - b.rank).slice(0, 8)
    : getEligibleRivalsForTournament(t, allNonUserRivals, tournamentsThisWeek)
  let matches = t.category === "atp-finals"
    ? buildRoundRobinDraw(rivsForDraw, userRival, false)
    : buildDraw(t, rivsForDraw, userRival, false)
  matches = simNonUserMatches(matches, t.surface, bestOf)

  if (autoSimulate === true) {
    matches = t.category === "atp-finals"
      ? simulateRoundRobinToChampion(matches, t.surface, bestOf)
      : simulateToChampion(matches, t.surface, bestOf)
    const bonusMap = computeTournamentPointsBonus(matches, t.category, career.rivalBonusHistory, career.date)
    setCareer(prev => ({
      ...prev,
      tournamentResults: { ...prev.tournamentResults, [t.id]: matches },
      rivalBonusHistory: bonusMap,
    }))
  }

  setPlayingQualy(false)
  setQualyCompleted(false)
  setSelectedT(t)
  setDrawMatches(matches)
  setMatchResult(null)
  setView("draw")
  return
}

    setPlayedTournaments(prev => new Set(prev).add(t.id))
    setQualyCompleted(false)

    const allRivals = buildLiveRanking(career.player.tour, career.points, career.player, career.rivalBonusHistory, career.date)
  const allNonUserRivals = allRivals.filter(r => !r.isUser) as Rival[]
  const tournamentsThisWeek = getTournamentsOnDate(t.date)
  const rivsForDraw = t.category === "atp-finals"
    ? allNonUserRivals.sort((a, b) => a.rank - b.rank).slice(0, 8)
    : getEligibleRivalsForTournament(t, allNonUserRivals, tournamentsThisWeek)
  let matches: DrawMatch[] = []
  if (status.kind === "direct") {
    setPlayingQualy(false)
    matches = t.category === "atp-finals"
      ? buildRoundRobinDraw(rivsForDraw, userRival, true)
      : buildDraw(t, rivsForDraw, userRival, true)
    } else {
      setPlayingQualy(true)
      const qualyEntry = CATEGORY_INFO[t.category].qualyEntryRank
      const directLimit = CATEGORY_INFO[t.category].directEntryRank
      const qualyField = rivsForDraw
        .filter(r => r.rank > directLimit && r.rank <= qualyEntry)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 15)

      matches = buildDraw(t, qualyField, userRival, true, 16)
    }

    matches = simNonUserMatches(matches, t.surface, bestOf)

    setSelectedT(t)
    setDrawMatches(matches)
    setMatchResult(null)
    setView("draw")
  }

  function handleUserMatchClick(m: DrawMatch) {
    if (!selectedT || !m.p1 || !m.p2) return
    const userIs: 1 | 2 = m.p1.id === "USER" ? 1 : 2
    const info = CATEGORY_INFO[selectedT.category]
    const config: MatchConfig = {
      player1: m.p1,
      player2: m.p2,
      surface: selectedT.surface as any,
      bestOf: info.bestOf,
      finalSetTiebreak: true,
      finalSetTiebreakAt: selectedT.category === "grand-slam" ? 7 : 10,
    }
    setActiveMatch({ config, userIs, drawMatchId: m.id })
    setMatchResult(null)
    setView("match")
  }

  function handleMatchEnd(state: MatchState) {
    if (!activeMatch || !selectedT) return
    const userWon = state.winner === activeMatch.userIs
    const score = formatMatchScore(state, activeMatch.userIs)
    const bestOf = CATEGORY_INFO[selectedT.category].bestOf

    const info = CATEGORY_INFO[selectedT.category]
    const currentRound = drawMatches.filter(m => m.round === Math.max(...drawMatches.map(x => x.round))).length > 0
      ? Math.max(...drawMatches.map(x => x.round))
      : 0

    let ptsEarned: number
    let prizeEarned: number
    if (selectedT.category === "atp-finals") {
      const ATPF_PTS = { group: 200, semifinal: 400, final: info.winnerPoints }
      const ATPF_PRIZE = { group: 250000, semifinal: 600000, final: info.winnerPrize }
      const phase = currentRound <= 2 ? "group" : currentRound === 3 ? "semifinal" : "final"
      ptsEarned = userWon ? ATPF_PTS[phase] : Math.round(ATPF_PTS[phase] * 0.3)
      prizeEarned = userWon ? ATPF_PRIZE[phase] : Math.round(ATPF_PRIZE[phase] * 0.3)
    } else {
      const rounds = Math.log2(info.drawSize)
      ptsEarned = userWon ? pointsForResult(selectedT.category, rounds, currentRound + 1) : pointsForResult(selectedT.category, rounds, currentRound)
      prizeEarned = userWon ? prizeForResult(selectedT.category, rounds, currentRound + 1) : prizeForResult(selectedT.category, rounds, currentRound)
    }

    const updatedMatches = drawMatches.map(m => {
      if (m.id !== activeMatch.drawMatchId) return m
      const winner = userWon
        ? (activeMatch.userIs === 1 ? m.p1 : m.p2)
        : (activeMatch.userIs === 1 ? m.p2 : m.p1)
      return { ...m, winner, score }
    })

    let finalMatches = updatedMatches
    let justClassified = false

    if (userWon) {
      finalMatches = selectedT.category === "atp-finals"
        ? advanceFromSemifinals(advanceFromGroupStage(updatedMatches, selectedT.surface, bestOf), selectedT.surface, bestOf)
        : advanceDraw(updatedMatches, selectedT.surface, bestOf)

      if (playingQualy) {
        const qualyRounds = Math.log2(16) - 1
        if (currentRound >= qualyRounds - 1) {
          justClassified = true
          const allRivals = buildLiveRanking(player.tour, career.points, player, career.rivalBonusHistory, career.date)
          const rivsForDraw = allRivals.filter(r => !r.isUser) as Rival[]
          let mainMatches = buildDraw(selectedT, rivsForDraw, userRival, true)
          mainMatches = simNonUserMatches(mainMatches, selectedT.surface, bestOf)
          finalMatches = mainMatches
        }
      }
    } else {
      if (playingQualy) {
        // Perdió en qualy: generar el cuadro principal completo sin el usuario
        const allRivals = buildLiveRanking(player.tour, career.points, player, career.rivalBonusHistory, career.date)
        const rivsForDraw = allRivals.filter(r => !r.isUser) as Rival[]
        let mainMatches = buildDraw(selectedT, rivsForDraw, userRival, false)
        mainMatches = simNonUserMatches(mainMatches, selectedT.surface, bestOf)
        if (autoSimulate === true) {
          mainMatches = simulateToChampion(mainMatches, selectedT.surface, bestOf)
        }
        finalMatches = mainMatches
      } else if (selectedT.category === "atp-finals") {
        // Perdió un partido de grupo: el torneo sigue, solo avanza si el grupo está completo
        finalMatches = advanceFromSemifinals(advanceFromGroupStage(updatedMatches, selectedT.surface, bestOf), selectedT.surface, bestOf)
        if (autoSimulate === true) {
          finalMatches = simulateRoundRobinToChampion(finalMatches, selectedT.surface, bestOf)
        }
      } else {
        // Perdió en cuadro principal: avanzar la ronda actual
        finalMatches = advanceDraw(updatedMatches, selectedT.surface, bestOf)
        if (autoSimulate === true) {
          finalMatches = simulateToChampion(finalMatches, selectedT.surface, bestOf)
        }
      }
    }

    setDrawMatches(finalMatches)
    if (justClassified) {
      setQualyCompleted(true)
      setPlayingQualy(false)
    }

    // Si el torneo llegó a tener un campeón, lo guardamos como resultado final
    // y repartimos puntos de torneo entre todos los participantes
    const maxRFinal = Math.max(...finalMatches.map(m => m.round))
    const lastRoundMatches = finalMatches.filter(m => m.round === maxRFinal)
    const tournamentFinished = lastRoundMatches.length === 1 && !!lastRoundMatches[0].winner

    const bonusUpdate: Record<string, PointsEntry[]> | null = tournamentFinished
      ? computeTournamentPointsBonus(finalMatches, selectedT.category, career.rivalBonusHistory, career.date)
      : null

    const newPointsHistory = addPointsEntry(career.pointsHistory, ptsEarned, career.date, selectedT.name)
    const newPoints = recomputePoints(newPointsHistory, career.date)
    const newMoney = career.money + prizeEarned - (selectedT.entryFee ?? 0)
    const resultMsg = userWon
      ? `✅ Victoria en ${selectedT.name}: +${ptsEarned} pts, +${formatMoney(prizeEarned)}`
      : `❌ Eliminado en ${selectedT.name}: +${ptsEarned} pts, +${formatMoney(prizeEarned)}`

const xpGained = userWon ? XP_REWARDS.win : XP_REWARDS.loss
    const { level: newLevel, xp: newXp, levelsGained } = applyXP(career.level, career.xp, xpGained)
    const newFitness = applyEnergy(career.fitness, ENERGY_DELTA.match)

    setCareer(prev => ({
      ...prev,
      points: newPoints,
      pointsHistory: newPointsHistory,
      money: newMoney,
      level: newLevel,
      xp: newXp,
      fitness: newFitness,
      matchesWon: prev.matchesWon + (userWon ? 1 : 0),
      matchesLost: prev.matchesLost + (userWon ? 0 : 1),
      seasonStats: {
        ...prev.seasonStats,
        matchesWon: prev.seasonStats.matchesWon + (userWon ? 1 : 0),
        matchesLost: prev.seasonStats.matchesLost + (userWon ? 0 : 1),
        pointsEarned: prev.seasonStats.pointsEarned + ptsEarned,
        bestRank: Math.min(prev.seasonStats.bestRank, playerRank),
      },
      log: levelsGained > 0
        ? [...prev.log, resultMsg, `🎉 ¡Subiste a nivel ${newLevel}!`]
        : [...prev.log, resultMsg],
      tournamentResults: tournamentFinished
        ? { ...prev.tournamentResults, [selectedT.id]: finalMatches }
        : prev.tournamentResults,
      rivalBonusHistory: bonusUpdate ?? prev.rivalBonusHistory,
rivalPalmares: bonusUpdate
  ? updateRivalPalmares(finalMatches, selectedT.name, prev.rivalPalmares)
  : prev.rivalPalmares,
      history: [...prev.history, {
        id: `${selectedT.id}-${Date.now()}`,
        date: career.date,
        tournament: selectedT.name,
        round: `Ronda ${currentRound + 1}`,
        opponent: activeMatch.userIs === 1
          ? `${activeMatch.config.player2.firstName} ${activeMatch.config.player2.lastName}`
          : `${activeMatch.config.player1.firstName} ${activeMatch.config.player1.lastName}`,
        opponentRank: activeMatch.userIs === 1 ? activeMatch.config.player2.rank : activeMatch.config.player1.rank,
        scoreline: score,
        won: userWon,
        surface: selectedT.surface,
      }],
    }))

    setMatchResult(resultMsg)
  }

  function handleSimularRonda() {
    if (!selectedT) return
    const bestOf = CATEGORY_INFO[selectedT.category].bestOf

    if (selectedT.category === "atp-finals") {
      let current = drawMatches

      // Simular partidos pendientes de la jornada actual del grupo
      const pendingGroup = current.filter(m => m.phase === "group" && !m.winner)
      if (pendingGroup.length > 0) {
        // Simular solo la jornada más baja que tenga pendientes
        const nextRound = Math.min(...pendingGroup.map(m => m.round))
        current = current.map(m => {
          if (m.phase !== "group" || m.round !== nextRound || m.winner || m.isUser || !m.p1 || !m.p2) return m
          const config: MatchConfig = {
            player1: m.p1, player2: m.p2,
            surface: selectedT.surface as any,
            bestOf, finalSetTiebreak: true, finalSetTiebreakAt: 10,
          }
          const result = simulateFullMatch(config)
          return { ...m, winner: result.winner === 1 ? m.p1 : m.p2, score: formatMatchScore(result, 1) }
        })
      }

      // Intentar avanzar a semifinales y final
      current = advanceFromGroupStage(current, selectedT.surface, bestOf)
      current = advanceFromSemifinals(current, selectedT.surface, bestOf)

      const finalMatch = current.find(m => m.phase === "final")
      const finished = !!finalMatch?.winner
      if (finished) {
        const bonusMap = computeTournamentPointsBonus(current, selectedT.category, career.rivalBonusHistory, career.date)
        setCareer(prev => ({
  ...prev,
  tournamentResults: { ...prev.tournamentResults, [selectedT.id]: current },
  rivalBonusHistory: bonusMap,
  rivalPalmares: updateRivalPalmares(current, selectedT.name, prev.rivalPalmares),
}))
      }
      setDrawMatches([...current])
      return
    }

    let current = drawMatches
    const maxR = Math.max(...current.map(m => m.round))
    const roundMatches = current.filter(m => m.round === maxR)

    if (roundMatches.length <= 1 && roundMatches[0]?.winner) return

    const allDecided = roundMatches.every(m => m.winner)

    if (!allDecided) {
      current = simNonUserMatches(current, selectedT.surface, bestOf)
      const nowAllDecided = current.filter(m => m.round === maxR).every(m => m.winner)
      if (nowAllDecided) {
        current = advanceDraw(current, selectedT.surface, bestOf)
      }
    } else {
      current = advanceDraw(current, selectedT.surface, bestOf)
    }

    const newMaxR = Math.max(...current.map(m => m.round))
    const newRoundMatches = current.filter(m => m.round === newMaxR)
    const finished = newRoundMatches.length === 1 && !!newRoundMatches[0].winner
    if (finished) {
      const bonusMap = computeTournamentPointsBonus(current, selectedT.category, career.rivalBonusHistory, career.date)
      setCareer(prev => ({
  ...prev,
  tournamentResults: { ...prev.tournamentResults, [selectedT.id]: finished },
  rivalBonusHistory: bonusMap,
  rivalPalmares: updateRivalPalmares(current, selectedT.name, prev.rivalPalmares),
}))
    }

    setDrawMatches([...current])
  }
  

  function advanceWeek() {
    setCareer(prev => {
      const advanced: CareerState = {
        ...prev,
        date: addWeeks(prev.date, 1),
        fitness: applyEnergy(prev.fitness, ENERGY_DELTA.rest),
      }
      const recalculated = recomputePoints(advanced.pointsHistory, advanced.date)
      const next = checkAnnualProgression({ ...advanced, points: recalculated })

      // Detectar cambio de temporada
      if (next.lastProgressionDate !== prev.lastProgressionDate) {
        const completedYear = new Date(prev.lastProgressionDate).getFullYear()
        const seasonSummaryData = next.seasonStats

        // Resetear stats de temporada y Copa Davis
        setTimeout(() => setSeasonSummary({ ...prev.seasonStats, year: completedYear }), 100)
        return {
          ...next,
          davisCup: null,
          seasonStats: {
            matchesWon: 0,
            matchesLost: 0,
            bestRank: getPlayerRank(next),
            pointsEarned: 0,
            year: completedYear + 1,
          },
          log: [
            ...next.log,
            `📊 Temporada ${completedYear}: ${prev.seasonStats.matchesWon}W/${prev.seasonStats.matchesLost}L · Mejor ranking: #${prev.seasonStats.bestRank} · ${prev.seasonStats.pointsEarned} puntos ganados`,
          ],
        }
      }

      // Resetear Copa Davis al inicio de cada año nuevo (sin progresión)
      const prevYear = new Date(prev.date).getFullYear()
      const nextYear = new Date(next.date).getFullYear()
      if (nextYear > prevYear && next.davisCup?.year !== nextYear) {
        return { ...next, davisCup: null }
      }

      // Si hubo progresión anual (la fecha de última progresión cambió), evolucionamos el roster
      if (next.lastProgressionDate !== prev.lastProgressionDate) {
        evolveRoster(prev.player.tour, next.date)
      }

      return next
    })
    
  }

  function buyEnergyBottle() {
    if (career.money < BOTTLE_COST) return
    setCareer(prev => ({
      ...prev,
      money: prev.money - BOTTLE_COST,
      fitness: applyEnergy(prev.fitness, ENERGY_DELTA.bottle),
      log: [...prev.log, `💊 Compraste una botella energizante (+${ENERGY_DELTA.bottle} energía)`],
    }))
  }

  function handleUpgradeAttribute(key: VisibleKey) {
    const available = availableAttributePoints(career.level, career.spentAttributePoints)
    const result = upgradeAttribute(
      career.player.attributes,
      key,
      available,
      career.player.playStyle,
      career.player.height,
      career.player.weight,
      career.player.tour,
      career.capBreakers
    )
    if (!result.success) {
      setCareer(prev => ({ ...prev, log: [...prev.log, `⚠️ ${result.reason}`] }))
      return
    }
    setCareer(prev => ({
      ...prev,
      player: { ...prev.player, attributes: result.newAttrs },
      spentAttributePoints: prev.spentAttributePoints + result.pointsSpent,
    }))
  }

  function handleTrain() {
    if (career.fitness < 25) {
      setCareer(prev => ({ ...prev, log: [...prev.log, "⚠️ No tenés suficiente energía para entrenar"] }))
      return
    }
    const { level: newLevel, xp: newXp, levelsGained } = applyXP(career.level, career.xp, XP_REWARDS.training)
    const newFitness = applyEnergy(career.fitness, ENERGY_DELTA.training)
    setCareer(prev => ({
      ...prev,
      level: newLevel,
      xp: newXp,
      fitness: newFitness,
      log: levelsGained > 0
        ? [...prev.log, `💪 Sesión de entrenamiento completada`, `🎉 ¡Subiste a nivel ${newLevel}!`]
        : [...prev.log, `💪 Sesión de entrenamiento completada`],
    }))
  }

function RivalModal({ rival, onClose }: { rival: Rival; onClose: () => void }) {
  const palmares = career.rivalPalmares[rival.id] ?? []
  const ATTR_LABELS: Record<string, string> = {
    serve: "Saque", drive: "Drive", backhand: "Revés", volley: "Volea",
    return: "Devolución", defense: "Defensa", speed: "Velocidad",
    stamina: "Resistencia", power: "Potencia", mentality: "Mentalidad",
  }
  const STYLE_LABELS: Record<string, string> = {
    "aggressive-baseline": "Agresivo de fondo",
    "defensive-baseline": "Defensivo",
    "serve-volley": "Saque y volea",
    "all-around": "All-around",
  }
  const SURFACE_LABELS: Record<string, string> = {
    hard: "Dura", clay: "Polvo de ladrillo", grass: "Césped", carpet: "Indoor"
  }
  const ovr = computeOverall(rival.attributes, rival.playStyle)
  const visibleKeys = ["serve","drive","backhand","volley","return","defense","speed","stamina","power","mentality"] as const

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">{rival.firstName} {rival.lastName}</div>
            <div className="text-sm text-zinc-400">{rival.nationality} · {rival.age} años · #{rival.rank}</div>
          </div>
          <div className="flex flex-col items-center bg-blue-900/40 rounded-lg px-3 py-1">
            <span className="text-xl font-bold text-blue-300">{ovr}</span>
            <span className="text-[10px] text-zinc-500">OVR</span>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Estilo</div>
            <div className="font-semibold">{STYLE_LABELS[rival.playStyle] ?? rival.playStyle}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Superficie favorita</div>
            <div className="font-semibold">{SURFACE_LABELS[rival.favSurface] ?? rival.favSurface}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Mano</div>
            <div className="font-semibold">{rival.handedness === "right" ? "Diestro" : "Zurdo"}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Revés</div>
            <div className="font-semibold">{rival.backhand === "two" ? "Dos manos" : "Una mano"}</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Altura / Peso</div>
            <div className="font-semibold">{rival.height} cm · {rival.weight} kg</div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-2">
            <div className="text-zinc-500 mb-0.5">Puntos ranking</div>
            <div className="font-semibold">{rival.points} pts</div>
          </div>
        </div>

        {/* Atributos */}
        <div>
          <div className="text-xs font-bold text-zinc-400 mb-2">ATRIBUTOS</div>
          <div className="space-y-1.5">
            {visibleKeys.map(key => {
              const val = rival.attributes[key] ?? 0
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-20 text-xs text-zinc-400 shrink-0">{ATTR_LABELS[key]}</div>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${val}%` }} />
                  </div>
                  <div className="w-6 text-right font-mono text-xs text-zinc-300">{val}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Palmarés */}
        <div>
          <div className="text-xs font-bold text-zinc-400 mb-2">PALMARÉS EN ESTA CARRERA</div>
          {palmares.length === 0 ? (
            <div className="text-xs text-zinc-600">Sin títulos registrados aún</div>
          ) : (
            <div className="space-y-1">
              {[...new Set(palmares)].map((t, i) => {
                const count = palmares.filter(x => x === t).length
                return (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-zinc-300">{t}</span>
                    {count > 1 && <span className="text-yellow-400 font-bold">×{count}</span>}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  )
}

function SeasonSummaryModal({ stats, onClose }: {
    stats: CareerState["seasonStats"]
    onClose: () => void
  }) {
    const progressMsg = career.log.find(l => l.includes(`Temporada ${stats.year}`)) ?? ""
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm space-y-5 text-center">
          <div className="text-2xl">📊</div>
          <div>
            <div className="text-lg font-bold">Temporada {stats.year} completada</div>
            <div className="text-sm text-zinc-400 mt-0.5">{career.player.firstName} {career.player.lastName} · {career.player.age} años</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xl font-bold">{stats.matchesWon}W / {stats.matchesLost}L</div>
              <div className="text-xs text-zinc-500 mt-0.5">Récord temporada</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3">
              <div className="text-xl font-bold text-yellow-300">#{stats.bestRank}</div>
              <div className="text-xs text-zinc-500 mt-0.5">Mejor ranking</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-3 col-span-2">
              <div className="text-xl font-bold text-green-400">+{stats.pointsEarned} pts</div>
              <div className="text-xs text-zinc-500 mt-0.5">Puntos ganados en la temporada</div>
            </div>
          </div>
          {progressMsg && (
            <div className="text-xs text-zinc-400 bg-zinc-800 rounded-lg p-3 text-left">
              {progressMsg.replace(`📊 Temporada ${stats.year}: `, "")}
            </div>
          )}
          <Button className="w-full" onClick={onClose}>
            Continuar →
          </Button>
        </div>
      </div>
    )
  }


  /* ---- RENDER ---- */

  return (
    <div className="space-y-6">
      {/* Career header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="text-lg font-bold">{career.player.firstName} {career.player.lastName}</div>
          <div className="text-sm text-zinc-400">{formatDate(career.date)} · Circuito {career.player.tour}</div>
        </div>
        <div className="flex gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-blue-300">{computeOverall(career.player.attributes, career.player.playStyle)}</div>
            <div className="text-xs text-zinc-500">OVR</div>
          </div>
          <div>
            <div className="text-xl font-bold">{career.player.age}</div>
            <div className="text-xs text-zinc-500">Edad</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-300">#{playerRank}</div>
            <div className="text-xs text-zinc-500">Ranking</div>
          </div>
          <div>
            <div className="text-xl font-bold">{career.points}</div>
            <div className="text-xs text-zinc-500">Puntos</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">{formatMoney(career.money)}</div>
            <div className="text-xs text-zinc-500">Dinero</div>
          </div>
          <div>
            <div className="text-xl font-bold">{career.matchesWon}W / {career.matchesLost}L</div>
            <div className="text-xs text-zinc-500">Récord</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      {view !== "match" && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={view === "hub" ? "default" : "outline"} onClick={() => setView("hub")}>🏠 Hub</Button>
          <Button size="sm" variant={view === "calendar" ? "default" : "outline"} onClick={() => setView("calendar")}>📅 Calendario</Button>
          {selectedT && (
            <Button size="sm" variant={view === "draw" ? "default" : "outline"} onClick={() => setView("draw")}>
              🎾 {selectedT.name}
            </Button>
          )}
          <Button size="sm" variant={view === "ranking" ? "default" : "outline"} onClick={() => setView("ranking")}>
            📊 Ranking
          </Button>
          <Button size="sm" variant={view === "training" ? "default" : "outline"} onClick={() => setView("training")}>
            🏋️ Entrenamiento
          </Button>
          <Button size="sm" variant="outline" className="text-red-400 border-red-800 hover:bg-red-900/30" onClick={() => setView("retire")}>
            🚪 Retirarse
          </Button>
        <Button size="sm" variant={view === "davis" ? "default" : "outline"} onClick={() => setView("davis")}>
  🏆 Copa Davis
</Button>
</div>
      )}

      {/* DAVIS CUP */}
      {view === "davis" && (
        <div className="space-y-4">
          <div className="text-sm font-bold text-zinc-400 mb-3">🏆 COPA DAVIS</div>

          {!career.davisCup ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center space-y-3">
              <div className="text-zinc-400 text-sm">No hay Copa Davis iniciada para este año.</div>
              <Button onClick={() => {
                const year = new Date(career.date).getFullYear()
                const dc = initDavisCup(year, career.date, career.player.nationality)
                const invitation = checkUserInvitation(
                  career.player.nationality,
                  playerRank,
                  computeOverall(career.player.attributes, career.player.playStyle),
                  dc.teams
                )
                setCareer(prev => ({
                  ...prev,
                  davisCup: { ...dc, userInvited: invitation.invited },
                  log: invitation.invited
                    ? [...prev.log, `🎾 ¡El capitán te convocó a la Copa Davis ${year}!`]
                    : [...prev.log, `📋 No fuiste convocado a la Copa Davis ${year}.`],
                }))
              }}>
                Iniciar Copa Davis {new Date(career.date).getFullYear()}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Convocatoria */}
              {career.davisCup.userInvited && !career.davisCup.userAccepted && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4 space-y-3">
                  <div className="font-bold text-blue-300">🎾 ¡Fuiste convocado a la Copa Davis!</div>
                  <div className="text-sm text-zinc-400">
                    El capitán de {career.davisCup.userCountry} te llama a representar a tu país.
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => {
                      if (!career.davisCup) return
                      const dc = career.davisCup
                      // Insertar al usuario en el equipo de su país
                      const updatedTeams = dc.teams.map(team => {
                        if (team.country !== dc.userCountry) return team
                        const invitation = checkUserInvitation(dc.userCountry, playerRank, computeOverall(career.player.attributes, career.player.playStyle), dc.teams)
                        if (!invitation.invited) return team
                        const newPlayers = [...team.players]
                        newPlayers[invitation.position] = userRival
                        return { ...team, players: newPlayers }
                      })
                      // Actualizar también los draws ya generados con el equipo actualizado
                      const updatedRounds = dc.rounds.map(round =>
                        round.map(series => {
                          if (series.home.country === dc.userCountry) {
                            const updatedTeam = updatedTeams.find(t => t.country === dc.userCountry)!
                            return { ...series, home: updatedTeam }
                          }
                          if (series.away.country === dc.userCountry) {
                            const updatedTeam = updatedTeams.find(t => t.country === dc.userCountry)!
                            return { ...series, away: updatedTeam }
                          }
                          return series
                        })
                      )
                      setCareer(prev => ({
                        ...prev,
                        davisCup: { ...dc, userAccepted: true, teams: updatedTeams, rounds: updatedRounds },
                        log: [...prev.log, "✅ Aceptaste la convocatoria de la Copa Davis."],
                      }))
                    }}>
                      ✅ Aceptar convocatoria
                    </Button>
                    <Button variant="outline" onClick={() => setCareer(prev => ({
                      ...prev,
                      davisCup: prev.davisCup ? { ...prev.davisCup, userInvited: false } : null,
                      log: [...prev.log, "❌ Rechazaste la convocatoria de la Copa Davis."],
                    }))}>
                      ❌ Rechazar
                    </Button>
                  </div>
                </div>
              )}

              {/* Equipos participantes */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs font-bold text-zinc-400 mb-3">EQUIPOS PARTICIPANTES</div>
                <div className="grid grid-cols-4 gap-2">
                  {career.davisCup.teams.map(team => (
                    <div key={team.country} className={`text-center p-2 rounded-lg border text-xs
                      ${team.country === career.davisCup!.userCountry
                        ? "border-yellow-500/50 bg-yellow-500/5 text-yellow-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-300"}`}>
                      <div className="font-bold">{team.country}</div>
                      <div className="text-zinc-500 text-[10px]">{team.captain}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rondas */}
              {career.davisCup.rounds.map((round, roundIdx) => (
                round.length > 0 && (
                  <div key={roundIdx} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <div className="text-xs font-bold text-zinc-400 mb-3">
                      {roundIdx === 0 ? "OCTAVOS DE FINAL" : roundIdx === 1 ? "CUARTOS DE FINAL" : roundIdx === 2 ? "SEMIFINALES" : "FINAL"}
                    </div>
                    <div className="space-y-2">
                      {round.map(series => (
                        <div key={series.id} className={`border rounded-lg p-3 text-sm
                          ${series.home.country === career.davisCup!.userCountry || series.away.country === career.davisCup!.userCountry
                            ? "border-yellow-500/30 bg-yellow-500/5"
                            : "border-zinc-700 bg-zinc-800"}`}>
                          <div className="flex items-center justify-between">
                            <div className="font-bold">{series.home.country} vs {series.away.country}</div>
                            <div className="text-xs text-zinc-500">{series.surface}</div>
                          </div>
                          {series.winner ? (
                            <div className="text-xs mt-1">
                              <span className="text-green-400">✅ {series.winner === "home" ? series.home.country : series.away.country}</span>
                              <span className="text-zinc-500 ml-2">{series.homeWins}-{series.awayWins}</span>
                            </div>
                          ) : (
                            <div className="text-xs text-zinc-500 mt-1">
                              {series.homeWins > 0 || series.awayWins > 0
                                ? `${series.home.country} ${series.homeWins} - ${series.awayWins} ${series.away.country}`
                                : "Pendiente"}
                            </div>
                          )}
                          {/* Botón jugar si el usuario participa en esta serie */}
                          {career.davisCup?.userAccepted && !series.winner && (() => {
                            const userCountry = career.davisCup!.userCountry
                            const userIsHome = series.home.country === userCountry
                            const userIsAway = series.away.country === userCountry
                            if (!userIsHome && !userIsAway) return null

                            // Buscar el primer partido pendiente del usuario
                            const TYPE_LABELS: Record<string, string> = {
                              single1: "Singles 1", single2: "Singles 2",
                              doubles: "Dobles", single3: "Singles 3", single4: "Singles 4"
                            }
                            const pendingUserMatch = series.matches.find(m => m.isUser && !m.winner)
                            if (!pendingUserMatch) return null

                            return (
                              <Button
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => {
                                  setActiveDavisSeries(series)
                                  setActiveDavisMatchType(pendingUserMatch.type)
                                  setView("davis-match")
                                }}
                              >
                                ▶ Jugar {TYPE_LABELS[pendingUserMatch.type]}
                              </Button>
                            )
                          })()}
                          {series.matches.filter(m => m.winner).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {series.matches.map((m, mi) => {
                                const TYPE_LABELS: Record<string, string> = {
                                  single1: "Singles 1", single2: "Singles 2",
                                  doubles: "Dobles", single3: "Singles 3", single4: "Singles 4"
                                }
                                if (!m.winner) return (
                                  <div key={mi} className="text-[10px] text-zinc-600 flex justify-between">
                                    <span>{TYPE_LABELS[m.type]}</span>
                                    <span>—</span>
                                  </div>
                                )
                                const homeWon = m.winner === "home"
                                return (
                                  <div key={mi} className="text-[10px] flex justify-between items-center">
                                    <span className="text-zinc-500">{TYPE_LABELS[m.type]}</span>
                                    <span className={homeWon ? "text-green-400" : "text-zinc-400"}>
                                      {homeWon
                                        ? `${m.homePlayer1?.firstName[0]}. ${m.homePlayer1?.lastName}`
                                        : `${m.awayPlayer1?.firstName[0]}. ${m.awayPlayer1?.lastName}`}
                                    </span>
                                    <span className="text-zinc-600 font-mono">{m.score}</span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Simular ronda */}
                    {round.every(s => !s.winner) && (() => {
  const playable = isDavisRoundPlayable(roundIdx, career.davisCup!.year, career.date)
  const minDateLabel = ["febrero", "julio", "septiembre", "noviembre"][roundIdx]
  return playable ? (
    <Button className="w-full mt-3" variant="outline" onClick={() => {
                        const simulatedRound = round.map(s => simulateDavisSeries(s, career.davisCup?.userAccepted ? "USER" : ""))
                        const newRounds = [...career.davisCup!.rounds]
                        newRounds[roundIdx] = simulatedRound

                        // Si hay siguiente ronda vacía, generarla
                        if (roundIdx < 3 && newRounds[roundIdx + 1].length === 0) {
                          newRounds[roundIdx + 1] = advanceDavisRound(simulatedRound, roundIdx + 2, career.davisCup!.year)
                        }

                        const completed = roundIdx === 3
                        const champion = completed
                          ? (simulatedRound[0].winner === "home" ? simulatedRound[0].home.country : simulatedRound[0].away.country)
                          : null

                        setCareer(prev => ({
                          ...prev,
                          davisCup: prev.davisCup ? {
                            ...prev.davisCup,
                            rounds: newRounds,
                            completed,
                          } : null,
                          log: champion
                            ? [...prev.log, `🏆 ¡${champion} ganó la Copa Davis ${prev.davisCup?.year}!`]
                            : prev.log,
                        }))
                      }}>
                       ▶ Simular {roundIdx === 0 ? "Octavos" : roundIdx === 1 ? "Cuartos" : roundIdx === 2 ? "Semifinales" : "Final"}
                      </Button>
  ) : (
    <div className="text-xs text-zinc-500 text-center mt-3">
      🔒 Disponible en {minDateLabel} {career.davisCup!.year}
    </div>
  )
})()}
                    )
                  </div>
                )
              ))}

              {/* Campeón */}
              {career.davisCup.completed && (() => {
                const finalRound = career.davisCup.rounds[3]
                const champion = finalRound[0]?.winner === "home"
                  ? finalRound[0].home.country
                  : finalRound[0]?.away.country
                return (
                  <div className="bg-yellow-500/10 border border-yellow-600 rounded-xl p-4 text-center">
                    <div className="text-xl">🏆</div>
                    <div className="font-bold text-yellow-300">¡{champion} ganó la Copa Davis {career.davisCup.year}!</div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* DAVIS MATCH */}
      {view === "davis-match" && activeDavisSeries && activeDavisMatchType && (() => {
        const series = activeDavisSeries
        const userCountry = career.davisCup!.userCountry
        const userIsHome = series.home.country === userCountry
        const team = userIsHome ? series.home : series.away
        const rival = userIsHome ? series.away : series.home

        // Determinar jugadores del partido
        const userPlayer = userRival
        const s1 = team.players[0]
        const s2 = team.players[1]
        const rs1 = rival.players[0]
        const rs2 = rival.players[1]

        let p1: Rival | null = null
        let p2: Rival | null = null

        if (activeDavisMatchType === "single1") { p1 = userIsHome ? s1 : rs1; p2 = userIsHome ? rs1 : s1 }
        else if (activeDavisMatchType === "single2") { p1 = userIsHome ? s2 : rs2; p2 = userIsHome ? rs2 : s2 }
        else if (activeDavisMatchType === "doubles") { p1 = userIsHome ? s1 : rs1; p2 = userIsHome ? rs1 : s1 }
        else if (activeDavisMatchType === "single3") { p1 = userIsHome ? s1 : rs2; p2 = userIsHome ? rs2 : s1 }
        else if (activeDavisMatchType === "single4") { p1 = userIsHome ? s2 : rs1; p2 = userIsHome ? rs1 : s2 }

        // Reemplazar al jugador del equipo por el usuario si corresponde
        if (p1 && p1.id !== "USER") { if (userIsHome && (activeDavisMatchType === "single1" || activeDavisMatchType === "single3" || activeDavisMatchType === "doubles")) p1 = userPlayer }
        if (p2 && p2.id !== "USER") { if (!userIsHome && (activeDavisMatchType === "single1" || activeDavisMatchType === "single3" || activeDavisMatchType === "doubles")) p2 = userPlayer }

        if (!p1 || !p2) return null

        const userIs: 1 | 2 = p1.id === "USER" ? 1 : 2
        const TYPE_LABELS: Record<string, string> = {
          single1: "Singles 1", single2: "Singles 2",
          doubles: "Dobles", single3: "Singles 3", single4: "Singles 4"
        }

        const config: MatchConfig = {
          player1: p1, player2: p2,
          surface: series.surface as any,
          bestOf: 5,
          finalSetTiebreak: false,
          finalSetTiebreakAt: 7,
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setActiveDavisSeries(null); setActiveDavisMatchType(null); setView("davis") }}>← Volver</Button>
              <div>
                <div className="font-bold">Copa Davis {career.davisCup!.year}</div>
                <div className="text-xs text-zinc-500">{TYPE_LABELS[activeDavisMatchType]} · {series.home.country} vs {series.away.country}</div>
              </div>
            </div>

            {/* Banner de la serie */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center justify-between">
              <div className="text-center">
                <div className={`font-bold text-lg ${userIsHome ? "text-yellow-300" : "text-zinc-200"}`}>{series.home.country}</div>
                <div className="text-xs text-zinc-500">Local · {series.surface}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold font-mono">{series.homeWins} - {series.awayWins}</div>
                <div className="text-xs text-zinc-500">{TYPE_LABELS[activeDavisMatchType]}</div>
              </div>
              <div className="text-center">
                <div className={`font-bold text-lg ${!userIsHome ? "text-yellow-300" : "text-zinc-200"}`}>{series.away.country}</div>
                <div className="text-xs text-zinc-500">Visitante</div>
              </div>
            </div>

            <MatchSimUI
              config={config}
              userIs={userIs}
              onEnd={(matchState) => {
                const userWon = matchState.winner === userIs
                const score = formatMatchScore(matchState, userIs)

                // Actualizar la serie con el resultado
                const updatedRounds = career.davisCup!.rounds.map(round =>
                  round.map(s => {
                    if (s.id !== series.id) return s
                    const updatedMatches = s.matches.map(m => {
                      if (m.type !== activeDavisMatchType || m.winner) return m
                      const homeWon = (userIsHome && userWon) || (!userIsHome && !userWon)
                      return { ...m, winner: homeWon ? "home" as const : "away" as const, score }
                    })
                    const newHomeWins = updatedMatches.filter(m => m.winner === "home").length
                    const newAwayWins = updatedMatches.filter(m => m.winner === "away").length
                    const seriesWinner = newHomeWins >= 3 ? "home" as const : newAwayWins >= 3 ? "away" as const : null
                    return { ...s, matches: updatedMatches, homeWins: newHomeWins, awayWins: newAwayWins, winner: seriesWinner }
                  })
                )

                setCareer(prev => ({
                  ...prev,
                  davisCup: prev.davisCup ? { ...prev.davisCup, rounds: updatedRounds } : null,
                  matchesWon: prev.matchesWon + (userWon ? 1 : 0),
                  matchesLost: prev.matchesLost + (userWon ? 0 : 1),
                  log: [...prev.log, userWon
                    ? `✅ Victoria en Copa Davis (${TYPE_LABELS[activeDavisMatchType!]}): ${series.home.country} vs ${series.away.country}`
                    : `❌ Derrota en Copa Davis (${TYPE_LABELS[activeDavisMatchType!]}): ${series.home.country} vs ${series.away.country}`
                  ],
                }))

                setActiveDavisSeries(null)
                setActiveDavisMatchType(null)
                setView("davis")
              }}
            />
          </div>
        )
      })()}

      {/* HUB */}
      {view === "hub" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm font-bold text-zinc-400 mb-3">PRÓXIMOS TORNEOS</div>
            {upcoming.slice(0, 4).map((t, i) => {
              const prev = upcoming[i - 1]
              const showTransition = prev && t.season !== prev.season
              const status = entryStatus(t.category, playerRank)
              return (
                <div key={t.id}>
                  {showTransition && (
                    <div className="text-center text-yellow-400 font-bold py-3 border-y border-yellow-500/30 my-1 text-sm">
                      🏆 Fin de temporada {prev.season} — Inicio de temporada {t.season}
                    </div>
                  )}
                  <div className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{t.name}</div>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {catBadge(t.category)}
                        {surfaceBadge(t.surface)}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-500 shrink-0">{t.date}</div>
                    {status.kind !== "ineligible" ? (
                      <Button size="sm" onClick={() => enterTournament(t)}>Entrar</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => enterTournament(t)}>👁 Ver</Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <Button variant="outline" className="w-full" onClick={advanceWeek}>
            → Pasar semana ({formatDate(addWeeks(career.date, 1))})
          </Button>
          {career.log.slice(-5).reverse().map((l, i) => (
            <div key={i} className="text-xs text-zinc-500">{l}</div>
          ))}
        </div>
      )}
      {/* CALENDAR */}
      {view === "calendar" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-zinc-400 mb-3">CALENDARIO DE TEMPORADA</div>
          {upcoming.map((t, i) => {
  const prev = upcoming[i - 1]
  const showTransition = prev && t.season !== prev.season
  const status = entryStatus(t.category, playerRank)
  const info = CATEGORY_INFO[t.category]
  return (
    <div key={t.id}>
      {showTransition && (
        <div className="text-center text-yellow-400 font-bold py-4 border-y border-yellow-500/30 my-2">
          🏆 Fin de temporada {prev.season} — Inicio de temporada {t.season}
        </div>
      )}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{t.name}</div>
          <div className="text-xs text-zinc-500">{t.city}, {t.country} · {t.date}</div>
          <div className="flex gap-1 mt-1 flex-wrap">
            {catBadge(t.category)}
            {surfaceBadge(t.surface)}
            <span className="text-[10px] text-zinc-500 px-1">🏆 {info.winnerPoints} pts</span>
            <span className="text-[10px] text-zinc-500 px-1">💰 {formatMoney(info.winnerPrize)}</span>
          </div>
          <div className="text-xs mt-1 text-zinc-400">{status.label}</div>
        </div>
        {status.kind !== "ineligible" ? (
          <Button size="sm" onClick={() => enterTournament(t)}>Entrar</Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => enterTournament(t)}>👁 Ver</Button>
        )}
      </div>
    </div>
  )
})}
</div>   
      )}     

      {/* DRAW */}
      {view === "draw" && selectedT && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <div className="font-bold text-lg">{selectedT.name}</div>
              <div className="flex gap-1 mt-0.5">{catBadge(selectedT.category)}{surfaceBadge(selectedT.surface)}</div>
            </div>
          </div>

          {autoSimulate === null && drawMatches.every(m => !m.isUser) && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="text-sm font-semibold text-zinc-300">¿Cómo querés seguir este torneo?</div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAutoSimulate(true)
                    const bestOf = CATEGORY_INFO[selectedT.category].bestOf
                    const finished = selectedT.category === "atp-finals"
                      ? simulateRoundRobinToChampion(drawMatches, selectedT.surface, bestOf)
                      : simulateToChampion(drawMatches, selectedT.surface, bestOf)
                    const bonusMap = computeTournamentPointsBonus(finished, selectedT.category, career.rivalBonusHistory, career.date)
                    setCareer(prev => ({
  ...prev,
  tournamentResults: { ...prev.tournamentResults, [selectedT.id]: finished },
  rivalBonusHistory: bonusMap,
  rivalPalmares: updateRivalPalmares(finished, selectedT.name, prev.rivalPalmares),
}))
                    setDrawMatches(finished)
                  }}
                >
                  ⚡ Simular todo
                </Button>
                <Button variant="outline" onClick={() => setAutoSimulate(false)}>
                  📅 Ronda por ronda
                </Button>
              </div>
            </div>
          )}

          {matchResult && (
            <div className={`rounded-xl p-3 text-sm font-semibold border ${matchResult.startsWith("✅") ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300"}`}>
              {matchResult}
            </div>
          )}

          {playingQualy && !qualyCompleted && (
            <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-3 text-sm text-blue-300">
              🎾 Clasificación — Ganando esta fase accedés al cuadro principal
            </div>
          )}

          {qualyCompleted && (
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-sm text-green-300 font-bold">
              ✅ ¡Clasificado! Ahora jugás el cuadro principal
            </div>
          )}

          {(() => {
            const isRoundRobin = drawMatches.some(m => m.phase === "group")

            if (isRoundRobin) {
              const finalMatch = drawMatches.find(m => m.phase === "final")
              if (finalMatch?.winner) {
                return (
                  <div className="bg-yellow-500/10 border border-yellow-600 rounded-xl p-3 text-sm text-yellow-300 text-center">
                    🏆 Campeón ATP Finals: {finalMatch.winner.firstName} {finalMatch.winner.lastName}
                  </div>
                )
              }
              const hasUserPending = drawMatches.some(m => m.isUser && !m.winner)
              if (hasUserPending) return null
              return (
                <Button className="w-full" variant="outline" onClick={handleSimularRonda}>
                  ▶ Simular próxima jornada
                </Button>
              )
            }

            if (!matchResult) return null

            const maxR = Math.max(...drawMatches.map(m => m.round))
            const roundMatches = drawMatches.filter(m => m.round === maxR)
            const isFinalDecided = roundMatches.length === 1 && roundMatches[0]?.winner
            const hasUserPending = roundMatches.some(m => m.isUser && !m.winner)

            if (hasUserPending) return null

            if (isFinalDecided) {
              const champion = roundMatches[0].winner
              return (
                <div className="bg-yellow-500/10 border border-yellow-600 rounded-xl p-3 text-sm text-yellow-300 text-center">
                  🏆 Campeón: {champion?.firstName} {champion?.lastName}
                </div>
              )
            }

            return (
              <Button className="w-full" variant="outline" onClick={handleSimularRonda}>
                ▶ Simular próxima ronda
              </Button>
            )
          })()}

          <DrawViewer matches={drawMatches} onUserMatchClick={handleUserMatchClick} />
        </div>
      )}

      {/* TRAINING */}
      {view === "training" && (
        <div className="space-y-4">
          {/* Nivel y XP */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-zinc-400">NIVEL {career.level}</div>
              <div className="text-xs text-zinc-500">{career.xp} / {xpForNextLevel(career.level)} XP</div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${Math.min(100, (career.xp / xpForNextLevel(career.level)) * 100)}%` }}
              />
            </div>
          </div>

          {/* Energía */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold text-zinc-400">ENERGÍA</div>
              <div className="text-xs text-zinc-500">{career.fitness} / 100</div>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full ${career.fitness > 50 ? "bg-green-500" : career.fitness > 25 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${career.fitness}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={handleTrain} disabled={career.fitness < 25}>
                💪 Entrenar (-25 energía, +{XP_REWARDS.training} XP)
              </Button>
              <Button variant="outline" onClick={buyEnergyBottle} disabled={career.money < BOTTLE_COST}>
                🧃 Botella ({formatMoney(BOTTLE_COST)})
              </Button>
            </div>
          </div>

          {/* Atributos */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-zinc-400">ATRIBUTOS</div>
              <div className="text-xs font-bold text-yellow-300">
                {availableAttributePoints(career.level, career.spentAttributePoints)} puntos disponibles
              </div>
            </div>
            <div className="space-y-3">
              {VISIBLE_KEYS.map(key => {
                const label = ATTRIBUTE_LABELS.find(a => a.key === key)?.label ?? key
                const current = career.player.attributes[key] ?? 0
                const cap = computeAttributeCap(key, career.player.playStyle, career.player.height, career.player.weight, career.player.tour, career.capBreakers)
                const cost = attributeUpgradeCost(current)
                const available = availableAttributePoints(career.level, career.spentAttributePoints)
                const atCap = current >= cap
                const canAfford = available >= cost && !atCap
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-zinc-300 shrink-0">{label}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${atCap ? "bg-yellow-500" : "bg-blue-500"}`}
                        style={{ width: `${Math.min(100, (current / cap) * 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right font-mono text-xs text-zinc-400 shrink-0">
                      {current} <span className="text-zinc-600">/ {cap}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 w-20"
                      onClick={() => handleUpgradeAttribute(key)}
                      disabled={!canAfford}
                    >
                      {atCap ? "MAX" : `+1 (${cost})`}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}


      {/* RANKING */}
      {view === "ranking" && (
        <div className="space-y-2">
          <div className="text-sm font-bold text-zinc-400 mb-3">RANKING {player.tour}</div>
          {buildLiveRanking(career.player.tour, career.points, career.player, career.rivalBonusHistory, career.date).slice(0, 249).map(r => (
            <div
  key={r.id}
  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer hover:border-zinc-600
    ${r.isUser ? "border-yellow-500/50 bg-yellow-500/5" : "border-zinc-800 bg-zinc-900"}`}
  onClick={() => !r.isUser && setSelectedRival(r)}
>
              <span className={`w-8 text-right font-mono text-sm font-bold ${r.isUser ? "text-yellow-300" : "text-zinc-400"}`}>
                #{r.rank}
              </span>
              <span className={`flex-1 text-sm ${r.isUser ? "text-yellow-300 font-bold" : "text-zinc-200"}`}>
                {r.firstName} {r.lastName}
              </span>
              <span className="text-xs text-zinc-500">{r.nationality}</span>
              <span className="text-xs font-mono text-zinc-400">{r.points} pts</span>
            </div>
          ))}
        </div>
      )}

      {/* MATCH */}
      {view === "match" && activeMatch && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setActiveMatch(null); setView("draw") }}>← Volver</Button>
            <div>
              <div className="font-bold">{selectedT?.name}</div>
              <div className="text-xs text-zinc-500">{selectedT ? SURFACE_LABEL[selectedT.surface] : ""}</div>
            </div>
          </div>
          <MatchSimUI
            config={activeMatch.config}
            userIs={activeMatch.userIs}
            onEnd={handleMatchEnd}
          />
          {matchResult && (
            <Button className="w-full" onClick={() => { setActiveMatch(null); setView("draw") }}>
              Volver al cuadro
            </Button>
          )}
        </div>
      )}
   {/* RETIRE */}
      {view === "retire" && (
        <div className="space-y-4">
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center space-y-4">
            <div className="text-2xl">🎾</div>
            <div className="text-lg font-bold text-red-300">¿Querés retirarte del tenis profesional?</div>
            <div className="text-sm text-zinc-400">
              {career.player.firstName} {career.player.lastName} — {career.player.age} años — #{playerRank} del mundo
            </div>
            <div className="text-xs text-zinc-500">
              Esta acción es irreversible. Tu carrera quedará registrada con {career.matchesWon}W / {career.matchesLost}L y {career.titles} título{career.titles !== 1 ? "s" : ""}.
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Button variant="outline" onClick={() => setView("hub")}>← Volver</Button>
              <Button className="bg-red-700 hover:bg-red-600 text-white" onClick={() => setView("retired")}>
                Confirmar retiro
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RETIRED */}
      {view === "retired" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center space-y-4">
            <div className="text-3xl">🏆</div>
            <div className="text-xl font-bold">{career.player.firstName} {career.player.lastName} se retiró</div>
            <div className="text-sm text-zinc-400">
              {career.player.nationality} · {career.player.age} años · Mejor ranking: #{career.bestRank}
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xl font-bold text-yellow-300">{career.titles}</div>
                <div className="text-xs text-zinc-500">Títulos</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xl font-bold">{career.matchesWon}W / {career.matchesLost}L</div>
                <div className="text-xs text-zinc-500">Récord</div>
              </div>
              <div className="bg-zinc-800 rounded-lg p-3">
                <div className="text-xl font-bold text-green-400">{formatMoney(career.money)}</div>
                <div className="text-xs text-zinc-500">Ganado</div>
              </div>
            </div>
            <div className="text-xs text-zinc-600 mt-4">
              {career.log.slice(-3).map((l, i) => <div key={i}>{l}</div>)}
            </div>
          </div>
        </div>
      )}

{seasonSummary && (
        <SeasonSummaryModal
          stats={seasonSummary}
          onClose={() => setSeasonSummary(null)}
        />
      )}

      {selectedRival != null && (
        <RivalModal rival={selectedRival!} onClose={() => setSelectedRival(null)} />
      )}
    </div>
  )
}




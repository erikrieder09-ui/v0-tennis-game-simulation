"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createCareer, buildLiveRanking, getPlayerRank, addWeeks, formatDate, formatMoney, type CareerState } from "@/lib/career"
import { upcomingTournaments, entryStatus, CATEGORY_INFO, pointsForResult, prizeForResult, type Tournament } from "@/lib/calendar"
import { getRankings } from "@/lib/rivals"
import { simulateFullMatch, createMatchState, playPoint, playGame, playSet, formatMatchScore, type MatchState, type MatchConfig } from "@/lib/match-engine"
import type { PlayerProfile, Rival } from "@/lib/types"

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
}

function buildDraw(t: Tournament, rivals: Rival[], userRival: Rival, isDirect: boolean): DrawMatch[] {
  const info = CATEGORY_INFO[t.category]
  const size = info.drawSize

  // Select field
  const directLimit = info.directEntryRank
  const field = rivals
    .filter(r => r.id !== "USER" && r.rank <= directLimit + 20)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, size - (isDirect ? 1 : 0))

  // Shuffle unseeded (keep top 8 seeded)
  const seeded = field.slice(0, 8)
  const unseeded = field.slice(8)
  for (let i = unseeded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unseeded[i], unseeded[j]] = [unseeded[j], unseeded[i]]
  }

  const slots: (Rival | null)[] = new Array(size).fill(null)
  const seedPos = [0, size - 1, Math.floor(size / 2) - 1, Math.floor(size / 2), Math.floor(size / 4) - 1, Math.floor(size * 3 / 4), Math.floor(size / 4), Math.floor(size * 3 / 4) - 1]
  seeded.forEach((s, i) => { if (seedPos[i] !== undefined) slots[seedPos[i]] = s })

  const toPlace = isDirect ? [...unseeded, userRival] : unseeded
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

function simNonUserMatches(matches: DrawMatch[], surface: string): DrawMatch[] {
  return matches.map(m => {
    if (m.isUser || m.winner || !m.p1 || !m.p2) return m
    const config: MatchConfig = {
      player1: m.p1, player2: m.p2,
      surface: surface as any,
      bestOf: 3, finalSetTiebreak: true, finalSetTiebreakAt: 10,
    }
    const result = simulateFullMatch(config)
    const w = result.winner === 1 ? m.p1 : m.p2
    return { ...m, winner: w, score: formatMatchScore(result, 1) }
  })
}

function advanceDraw(matches: DrawMatch[], surface: string): DrawMatch[] {
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
      bestOf: 3, finalSetTiebreak: true, finalSetTiebreakAt: 10,
    }
    const result = simulateFullMatch(config)
    return { ...m, winner: result.winner === 1 ? m.p1 : m.p2, score: formatMatchScore(result, 1) }
  })

  return [...matches, ...simmed]
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

type View = "hub" | "calendar" | "tournament" | "draw" | "match"

export function CareerHub({ player }: Props) {
  const [career, setCareer] = useState<CareerState>(() => createCareer(player))
  const [view, setView] = useState<View>("hub")
  const [selectedT, setSelectedT] = useState<Tournament | null>(null)
  const [drawMatches, setDrawMatches] = useState<DrawMatch[]>([])
  const [activeMatch, setActiveMatch] = useState<{ config: MatchConfig; userIs: 1 | 2; drawMatchId: string } | null>(null)
  const [matchResult, setMatchResult] = useState<string | null>(null)

  const rivals = useMemo(() => getRankings(player.tour), [player.tour])
  const playerRank = getPlayerRank(career)

  const userRival: Rival = {
    id: "USER",
    tour: player.tour,
    firstName: player.firstName,
    lastName: player.lastName,
    nationality: player.nationality,
    age: player.age,
    handedness: player.handedness,
    backhand: player.backhand,
    height: player.height,
    weight: player.weight,
    playStyle: player.playStyle,
    attributes: player.attributes,
    overall: Math.round(Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.keys(player.attributes).length),
    rank: playerRank,
    points: career.points,
    favSurface: "hard",
    injuryProneness: 20,
    currentAbility: Math.round(Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.keys(player.attributes).length),
    potentialAbility: Math.round(Object.values(player.attributes).reduce((a, b) => a + b, 0) / Object.keys(player.attributes).length) + 10,
  }

  const upcoming = upcomingTournaments(career.date).slice(0, 12)

  function enterTournament(t: Tournament) {
    const status = entryStatus(t.category, playerRank)
    if (status.kind === "ineligible") return

    const isDirect = status.kind === "direct"
    const allRivals = buildLiveRanking(player.tour, career.points, player)
    const rivsForDraw = allRivals.filter(r => !r.isUser) as Rival[]

    let matches = buildDraw(t, rivsForDraw, userRival, isDirect)
    matches = simNonUserMatches(matches, t.surface)

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
    setView("match")
  }

  function handleMatchEnd(state: MatchState) {
    if (!activeMatch || !selectedT) return
    const userWon = state.winner === activeMatch.userIs
    const score = formatMatchScore(state, activeMatch.userIs)

    // Find round info for points/prize
    const info = CATEGORY_INFO[selectedT.category]
    const rounds = Math.log2(info.drawSize)
    const currentRound = drawMatches.filter(m => m.round === Math.max(...drawMatches.map(x => x.round))).length > 0
      ? Math.max(...drawMatches.map(x => x.round))
      : 0
    const ptsEarned = userWon ? pointsForResult(selectedT.category, rounds, currentRound + 1) : pointsForResult(selectedT.category, rounds, currentRound)
    const prizeEarned = userWon ? prizeForResult(selectedT.category, rounds, currentRound + 1) : prizeForResult(selectedT.category, rounds, currentRound)

    // Update draw
    const updatedMatches = drawMatches.map(m => {
      if (m.id !== activeMatch.drawMatchId) return m
      const winner = userWon
        ? (activeMatch.userIs === 1 ? m.p1 : m.p2)
        : (activeMatch.userIs === 1 ? m.p2 : m.p1)
      return { ...m, winner, score }
    })

    // Advance draw if user won
    let finalMatches = updatedMatches
    if (userWon) {
      finalMatches = advanceDraw(updatedMatches, selectedT.surface)
    }

    setDrawMatches(finalMatches)

    // Update career
    const newPoints = career.points + ptsEarned
    const newMoney = career.money + prizeEarned - (selectedT.entryFee ?? 0)
    const resultMsg = userWon
      ? `✅ Victoria en ${selectedT.name}: +${ptsEarned} pts, +${formatMoney(prizeEarned)}`
      : `❌ Eliminado en ${selectedT.name}: +${ptsEarned} pts, +${formatMoney(prizeEarned)}`

    setCareer(prev => ({
      ...prev,
      points: newPoints,
      money: newMoney,
      matchesWon: prev.matchesWon + (userWon ? 1 : 0),
      matchesLost: prev.matchesLost + (userWon ? 0 : 1),
      log: [...prev.log, resultMsg],
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
    setActiveMatch(null)
    setView("draw")
  }

  function advanceWeek() {
    setCareer(prev => ({
      ...prev,
      date: addWeeks(prev.date, 1),
      trainingUsedThisWeek: false,
    } as any))
  }

  /* ---- RENDER ---- */

  return (
    <div className="space-y-6">
      {/* Career header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
        <div>
          <div className="text-lg font-bold">{player.firstName} {player.lastName}</div>
          <div className="text-sm text-zinc-400">{formatDate(career.date)} · Circuito {player.tour}</div>
        </div>
        <div className="flex gap-4 text-center">
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
        </div>
      )}

      {/* HUB */}
      {view === "hub" && (
        <div className="space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="text-sm font-bold text-zinc-400 mb-3">PRÓXIMOS TORNEOS</div>
            {upcoming.slice(0, 4).map(t => {
              const status = entryStatus(t.category, playerRank)
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
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
                    <span className="text-xs text-zinc-600">No elegible</span>
                  )}
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
          {upcoming.map(t => {
            const status = entryStatus(t.category, playerRank)
            const info = CATEGORY_INFO[t.category]
            return (
              <div key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-4">
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
                  <span className="text-xs text-zinc-600 shrink-0">No elegible</span>
                )}
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
          {matchResult && (
            <div className={`rounded-xl p-3 text-sm font-semibold border ${matchResult.startsWith("✅") ? "bg-green-900/30 border-green-700 text-green-300" : "bg-red-900/30 border-red-700 text-red-300"}`}>
              {matchResult}
            </div>
          )}
          <DrawViewer matches={drawMatches} onUserMatchClick={handleUserMatchClick} />
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
        </div>
      )}
    </div>
  )
}

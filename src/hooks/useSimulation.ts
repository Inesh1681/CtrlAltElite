import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { diffAlerts, type Alert } from '../simulation/alerts'
import { generateCity } from '../simulation/city'
import { createInitialState, DEFAULT_PARAMS, step } from '../simulation/engine'
import { forecast, type Forecast } from '../simulation/forecast'
import { customProfile, HEAVY_MONSOON, SCENARIOS } from '../simulation/scenarios'
import type { RainfallProfile, SimParams, SimState } from '../simulation/types'
import { compareFromForecasts, highestLeverageZone, type WhatIfResult } from '../simulation/whatif'

export const MAX_MINUTES = 6 * 60
export const SPEEDS = [0.5, 1, 2, 4] as const
export type Speed = (typeof SPEEDS)[number]
/** ticks per second at 1x */
const BASE_TPS = 1.5

export type ScenarioChoice = { kind: 'preset'; id: string } | { kind: 'custom'; mmPerHour: number } | { kind: 'weather'; profile: RainfallProfile }

const CITY = generateCity()

export interface Simulation {
  state: SimState
  params: SimParams
  profile: RainfallProfile
  scenario: ScenarioChoice
  playing: boolean
  speed: Speed
  alerts: Alert[]
  forecast: Forecast
  selectedZoneId: string | null
  whatIfDrainage: number
  whatIf: WhatIfResult | null
  /** true when the what-if target differs from the selected zone (selected zone already critical) */
  whatIfIsFallback: boolean
  demoRunning: boolean
  finished: boolean
  /** number of recorded ticks that can be scrubbed to (0..maxTick) */
  maxTick: number

  play: () => void
  pause: () => void
  toggle: () => void
  reset: () => void
  stepOnce: () => void
  setSpeed: (s: Speed) => void
  setScenario: (s: ScenarioChoice) => void
  setRainfallMultiplier: (m: number) => void
  setDrainageMultiplier: (m: number) => void
  setWhatIfDrainage: (m: number) => void
  selectZone: (id: string | null) => void
  runDemo: () => void
  /** block / unblock a district's drainage channel */
  toggleBlocked: (id: string) => void
  /** rewind (or fast-forward within recorded history) to a tick; pauses */
  scrubTo: (tick: number) => void
}

function resolveProfile(choice: ScenarioChoice): RainfallProfile {
  if (choice.kind === 'preset') return SCENARIOS.find((s) => s.id === choice.id) ?? HEAVY_MONSOON
  if (choice.kind === 'custom') return customProfile(choice.mmPerHour)
  return choice.profile
}

export function useSimulation(): Simulation {
  const [state, setState] = useState<SimState>(() => createInitialState(CITY))
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS)
  const [scenario, setScenarioState] = useState<ScenarioChoice>({ kind: 'preset', id: 'monsoon' })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [whatIfDrainage, setWhatIfDrainage] = useState(1.2)
  const [demoRunning, setDemoRunning] = useState(false)

  const profile = useMemo(() => resolveProfile(scenario), [scenario])

  // refs so the interval callback always sees the latest values without re-subscribing
  const stateRef = useRef(state)
  const paramsRef = useRef(params)
  const profileRef = useRef(profile)
  const demoRef = useRef(demoRunning)
  const selectedRef = useRef(selectedZoneId)
  // full state per tick so the timeline can be scrubbed
  const framesRef = useRef<SimState[]>([state])
  const [maxTick, setMaxTick] = useState(0)
  useEffect(() => {
    stateRef.current = state
    paramsRef.current = params
    profileRef.current = profile
    demoRef.current = demoRunning
    selectedRef.current = selectedZoneId
  })

  const fc = useMemo(() => forecast(state, params, profile), [state, params, profile])

  const advance = useCallback(() => {
    const prev = stateRef.current
    if (prev.minutes >= MAX_MINUTES) {
      setPlaying(false)
      return
    }
    const next = step(prev, paramsRef.current, profileRef.current)
    const nextFc = forecast(next, paramsRef.current, profileRef.current)
    const newAlerts = diffAlerts(prev, next, nextFc)
    stateRef.current = next
    setState(next)
    framesRef.current = [...framesRef.current.slice(0, prev.tick + 1), next]
    setMaxTick(next.tick)
    if (newAlerts.length) {
      setAlerts((a) => [...newAlerts, ...a].slice(0, 60))
      // during the demo, auto-focus the first zone that escalates so the detail
      // panel + what-if fill in without the presenter clicking anything
      if (demoRef.current && !selectedRef.current) {
        const first = newAlerts.find((a) => a.level === 'CRITICAL' || a.level === 'WARNING')
        if (first) {
          selectedRef.current = first.zoneId
          setSelectedZoneId(first.zoneId)
        }
      }
    }
    if (next.minutes >= MAX_MINUTES) {
      setPlaying(false)
      setDemoRunning(false)
    }
  }, [])

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(advance, 1000 / (BASE_TPS * speed))
    return () => window.clearInterval(id)
  }, [playing, speed, advance])

  const finished = state.minutes >= MAX_MINUTES

  const reset = useCallback(() => {
    setPlaying(false)
    setDemoRunning(false)
    const fresh = createInitialState(CITY)
    stateRef.current = fresh
    setState(fresh)
    framesRef.current = [fresh]
    setMaxTick(0)
    setAlerts([])
  }, [])

  const setScenario = useCallback(
    (s: ScenarioChoice) => {
      setScenarioState(s)
      reset()
    },
    [reset],
  )

  const runDemo = useCallback(() => {
    reset()
    setScenarioState({ kind: 'preset', id: 'monsoon' })
    setParams((p) => ({ ...p, rainfallMultiplier: 1, drainageMultiplier: 1 }))
    setWhatIfDrainage(1.4)
    setSelectedZoneId(null)
    selectedRef.current = null
    setSpeed(1)
    setDemoRunning(true)
    demoRef.current = true
    setPlaying(true)
  }, [reset])

  // scenario forecast for the what-if lever (baseline forecast is `fc`)
  const altFc = useMemo(() => forecast(state, { ...params, drainageMultiplier: whatIfDrainage }, profile), [state, params, profile, whatIfDrainage])

  // what-if target: the selected zone while it still has a future critical crossing;
  // otherwise the zone whose crossing the intervention delays the most
  const whatIfTarget = useMemo(() => {
    const sel = selectedZoneId ? fc.byZone.get(selectedZoneId) : undefined
    if (selectedZoneId && sel && sel.minutesToCritical > 0 && Number.isFinite(sel.minutesToCritical)) return { id: selectedZoneId, fallback: false }
    const best = highestLeverageZone(fc, altFc)
    if (best) return { id: best, fallback: Boolean(selectedZoneId) }
    if (selectedZoneId) return { id: selectedZoneId, fallback: false }
    return null
  }, [selectedZoneId, fc, altFc])

  const whatIf = useMemo<WhatIfResult | null>(() => {
    if (!whatIfTarget) return null
    return compareFromForecasts(state, params, whatIfTarget.id, whatIfDrainage, fc, altFc)
  }, [state, params, whatIfTarget, whatIfDrainage, fc, altFc])

  return {
    state,
    params,
    profile,
    scenario,
    playing,
    speed,
    alerts,
    forecast: fc,
    selectedZoneId,
    whatIfDrainage,
    whatIf,
    whatIfIsFallback: whatIfTarget?.fallback ?? false,
    demoRunning,
    finished,
    maxTick,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    reset,
    stepOnce: () => {
      setPlaying(false)
      advance()
    },
    setSpeed,
    setScenario,
    setRainfallMultiplier: (m) => setParams((p) => ({ ...p, rainfallMultiplier: m })),
    setDrainageMultiplier: (m) => setParams((p) => ({ ...p, drainageMultiplier: m })),
    setWhatIfDrainage,
    selectZone: setSelectedZoneId,
    runDemo,
    toggleBlocked: (id) =>
      setParams((p) => ({
        ...p,
        blockedZones: p.blockedZones.includes(id) ? p.blockedZones.filter((z) => z !== id) : [...p.blockedZones, id],
      })),
    scrubTo: (tick) => {
      const frames = framesRef.current
      const t = Math.max(0, Math.min(frames.length - 1, Math.round(tick)))
      const target = frames[t]
      if (!target) return
      setPlaying(false)
      stateRef.current = target
      setState(target)
      // drop alerts raised after this point so replaying does not duplicate them
      setAlerts((a) => a.filter((al) => al.minutes <= target.minutes))
    },
  }
}

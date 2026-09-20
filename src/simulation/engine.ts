import { computeFlows } from './flow'
import { computeRisk } from './risk'
import type { RainfallProfile, SimParams, SimSnapshot, SimState, Zone, ZoneStatic } from './types'

export const DEFAULT_PARAMS: SimParams = {
  dtMinutes: 5,
  rainfallMultiplier: 1,
  drainageMultiplier: 1,
  conductance: 0.35,
  maxOutflowFraction: 0.4,
  outletFraction: 0.6,
  blockedZones: [],
}

/** mm/h → metres per tick */
export function mmPerHourToMetresPerTick(mmPerHour: number, dtMinutes: number): number {
  return (mmPerHour / 1000) * (dtMinutes / 60)
}

export function createInitialState(statics: ZoneStatic[]): SimState {
  const zones: Zone[] = statics.map((s) => ({
    ...s,
    waterLevel: s.initialWaterLevel,
    rainfallIntensity: 0,
    inflow: 0,
    outflow: 0,
    drained: 0,
    seaDischarge: 0,
    drainageUtilization: 0,
    dominantOutflowTo: null,
  }))
  const state: SimState = { tick: 0, minutes: 0, zones, history: [] }
  state.history.push(snapshot(state, 0))
  return state
}

/**
 * Advance the simulation by one tick. Pure: returns a new state, never mutates.
 *
 *   newWater = water + rainfallInput + upstreamInflow − drainageOutflow − downstreamOutflow
 */
export function step(state: SimState, params: SimParams, profile: RainfallProfile): SimState {
  const { dtMinutes } = params
  const baseRain = profile.intensityAt(state.minutes) * params.rainfallMultiplier
  const surge = profile.upstreamSurgeAt ? profile.upstreamSurgeAt(state.minutes) : 0
  const flows = computeFlows(state.zones, params)

  const zones: Zone[] = state.zones.map((z, i) => {
    const rainfallIntensity = baseRain * z.rainFactor
    const rainInput = mmPerHourToMetresPerTick(rainfallIntensity, dtMinutes) * z.catchmentFactor
    // external river inflow (barrage release / upstream flood wave) enters at the inlet cells
    const inflow = flows.inflow[i] + (z.isInlet ? mmPerHourToMetresPerTick(surge, dtMinutes) : 0)
    const outflow = flows.outflow[i]
    const blocked = params.blockedZones.length > 0 && params.blockedZones.includes(z.id)
    const capacity = blocked ? 0 : mmPerHourToMetresPerTick(z.drainageCapacity * params.drainageMultiplier, dtMinutes)

    const beforeDrain = Math.max(0, z.waterLevel + rainInput + inflow - outflow)
    const drained = Math.min(beforeDrain, capacity)
    const seaDischarge = z.isOutlet ? (beforeDrain - drained) * params.outletFraction : 0
    const waterLevel = beforeDrain - drained - seaDischarge

    // load on the drains relative to what they can remove (can exceed 1 = overwhelmed)
    const load = rainInput + inflow
    const drainageUtilization = capacity > 0 ? Math.min(2, load / capacity) : 2

    return {
      ...z,
      waterLevel,
      rainfallIntensity,
      inflow,
      outflow,
      drained,
      seaDischarge,
      drainageUtilization,
      dominantOutflowTo: flows.dominantTo[i],
    }
  })

  const next: SimState = {
    tick: state.tick + 1,
    minutes: state.minutes + dtMinutes,
    zones,
    history: state.history,
  }
  next.history = [...state.history, snapshot(next, baseRain)]
  return next
}

/** Run `ticks` steps without keeping history (used for projections). */
export function project(state: SimState, params: SimParams, profile: RainfallProfile, ticks: number): SimState[] {
  const out: SimState[] = []
  let s: SimState = { ...state, history: [] }
  for (let i = 0; i < ticks; i++) {
    s = step(s, params, profile)
    s = { ...s, history: [] }
    out.push(s)
  }
  return out
}

export function snapshot(state: SimState, rainfall: number): SimSnapshot {
  const n = state.zones.length || 1
  let sumWater = 0
  let maxWater = 0
  let sumUtil = 0
  let high = 0
  let flooded = 0
  let popRisk = 0
  let popFlooded = 0
  for (const z of state.zones) {
    sumWater += z.waterLevel
    maxWater = Math.max(maxWater, z.waterLevel)
    sumUtil += Math.min(1, z.drainageUtilization)
    const r = computeRisk(z)
    if (r.level === 'CRITICAL' || r.level === 'FLOODED' || r.level === 'WARNING') {
      high++
      popRisk += z.population
    }
    if (r.level === 'FLOODED') {
      flooded++
      popFlooded += z.population
    }
  }
  return {
    tick: state.tick,
    minutes: state.minutes,
    avgWater: sumWater / n,
    maxWater,
    rainfall,
    avgDrainageUtil: sumUtil / n,
    highRiskCount: high,
    floodedCount: flooded,
    populationAtRisk: popRisk,
    populationFlooded: popFlooded,
  }
}

export function formatSimTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes)) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return `${h}h ${String(m).padStart(2, '0')}m`
}

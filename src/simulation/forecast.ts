import { project } from './engine'
import { CRITICAL_RATIO } from './risk'
import type { RainfallProfile, SimParams, SimState } from './types'

export const PROJECTION_TICKS = 60 // 5 h at 5-minute ticks

export interface ZoneForecast {
  /** simulated minutes from now until water ≥ 75% of threshold, or Infinity */
  minutesToCritical: number
  /** simulated minutes from now until water ≥ threshold, or Infinity */
  minutesToFlood: number
  /** projected peak water level within the horizon */
  peakWater: number
}

export interface Forecast {
  byZone: Map<string, ZoneForecast>
  /** first zone to go critical: id and minutes, or null */
  firstCritical: { zoneId: string; minutes: number } | null
  /** peak number of zones simultaneously ≥ critical within the horizon */
  peakCritical: number
  peakFlooded: number
}

/**
 * Run the deterministic engine forward from `state` and record, per zone, when it
 * crosses the critical and flood thresholds. Used for "time to critical", alerts
 * and what-if comparisons. Zones already past a threshold report 0.
 */
export function forecast(state: SimState, params: SimParams, profile: RainfallProfile, ticks = PROJECTION_TICKS): Forecast {
  const byZone = new Map<string, ZoneForecast>()
  for (const z of state.zones) {
    const ratio = z.waterLevel / z.floodThreshold
    byZone.set(z.id, {
      minutesToCritical: ratio >= CRITICAL_RATIO ? 0 : Infinity,
      minutesToFlood: ratio >= 1 ? 0 : Infinity,
      peakWater: z.waterLevel,
    })
  }

  const future = project(state, params, profile, ticks)
  let peakCritical = 0
  let peakFlooded = 0
  for (const s of future) {
    const dt = s.minutes - state.minutes
    let crit = 0
    let flooded = 0
    for (const z of s.zones) {
      const ratio0 = z.waterLevel / z.floodThreshold
      if (ratio0 >= CRITICAL_RATIO) crit++
      if (ratio0 >= 1) flooded++
    }
    peakCritical = Math.max(peakCritical, crit)
    peakFlooded = Math.max(peakFlooded, flooded)
    for (const z of s.zones) {
      const f = byZone.get(z.id)!
      const ratio = z.waterLevel / z.floodThreshold
      if (ratio >= CRITICAL_RATIO && f.minutesToCritical === Infinity) f.minutesToCritical = dt
      if (ratio >= 1 && f.minutesToFlood === Infinity) f.minutesToFlood = dt
      if (z.waterLevel > f.peakWater) f.peakWater = z.waterLevel
    }
  }

  let firstCritical: Forecast['firstCritical'] = null
  for (const [zoneId, f] of byZone) {
    if (f.minutesToCritical > 0 && Number.isFinite(f.minutesToCritical)) {
      if (!firstCritical || f.minutesToCritical < firstCritical.minutes) firstCritical = { zoneId, minutes: f.minutesToCritical }
    }
  }

  return { byZone, firstCritical, peakCritical, peakFlooded }
}

import { forecast, type Forecast } from './forecast'
import type { RainfallProfile, SimParams, SimState } from './types'

export interface WhatIfResult {
  zoneId: string
  zoneName: string
  baselineDrainage: number
  scenarioDrainage: number
  /** minutes until the zone is critical under current drainage (Infinity = never in horizon) */
  baselineMinutes: number
  scenarioMinutes: number
  /** scenarioMinutes − baselineMinutes (Infinity if scenario never goes critical) */
  delayMinutes: number
  baselinePeak: number
  scenarioPeak: number
  baselineCriticalZones: number
  scenarioCriticalZones: number
}

/**
 * Compare time-to-critical for one zone with the current drainage multiplier
 * versus a scenario multiplier. Both runs use the identical deterministic engine.
 */
export function compareDrainage(
  state: SimState,
  params: SimParams,
  profile: RainfallProfile,
  zoneId: string,
  scenarioDrainage: number,
): WhatIfResult {
  const base = forecast(state, params, profile)
  const alt = forecast(state, { ...params, drainageMultiplier: scenarioDrainage }, profile)
  return compareFromForecasts(state, params, zoneId, scenarioDrainage, base, alt)
}

/**
 * The zone whose critical crossing is delayed the most by the scenario drainage —
 * the best place to show the value of an intervention. null if no zone has a
 * future crossing under the baseline.
 */
export function highestLeverageZone(base: Forecast, alt: Forecast): string | null {
  let best: string | null = null
  let bestDelay = -1
  for (const [id, b] of base.byZone) {
    if (!(b.minutesToCritical > 0 && Number.isFinite(b.minutesToCritical))) continue
    const a = alt.byZone.get(id)!
    const delay = Number.isFinite(a.minutesToCritical) ? a.minutesToCritical - b.minutesToCritical : 1e9
    if (delay > bestDelay) {
      bestDelay = delay
      best = id
    }
  }
  return best
}

export function compareFromForecasts(
  state: SimState,
  params: SimParams,
  zoneId: string,
  scenarioDrainage: number,
  base: Forecast,
  alt: Forecast,
): WhatIfResult {
  const zone = state.zones.find((z) => z.id === zoneId) ?? state.zones[0]
  const b = base.byZone.get(zone.id)!
  const a = alt.byZone.get(zone.id)!
  const delay = Number.isFinite(a.minutesToCritical)
    ? a.minutesToCritical - b.minutesToCritical
    : Number.isFinite(b.minutesToCritical)
      ? Infinity
      : 0
  return {
    zoneId: zone.id,
    zoneName: zone.name,
    baselineDrainage: params.drainageMultiplier,
    scenarioDrainage,
    baselineMinutes: b.minutesToCritical,
    scenarioMinutes: a.minutesToCritical,
    delayMinutes: delay,
    baselinePeak: b.peakWater,
    scenarioPeak: a.peakWater,
    baselineCriticalZones: base.peakCritical,
    scenarioCriticalZones: alt.peakCritical,
  }
}

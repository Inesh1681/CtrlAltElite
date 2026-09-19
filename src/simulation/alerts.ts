import { formatDuration } from './engine'
import type { Forecast } from './forecast'
import { computeRisk } from './risk'
import { RISK_ORDER, type RiskLevel, type SimState } from './types'

export interface Alert {
  id: string
  /** simulated minutes when the alert was raised */
  minutes: number
  zoneId: string
  zoneName: string
  level: Exclude<RiskLevel, 'SAFE'>
  message: string
  reason: string
}

/**
 * Compare risk levels between two consecutive states and raise an alert for each
 * zone whose level escalated. Deterministic: same states → same alerts.
 */
export function diffAlerts(prev: SimState, next: SimState, fc: Forecast): Alert[] {
  const alerts: Alert[] = []
  const prevLevels = new Map(prev.zones.map((z) => [z.id, computeRisk(z).level]))
  for (const z of next.zones) {
    const risk = computeRisk(z)
    const before = prevLevels.get(z.id) ?? 'SAFE'
    if (RISK_ORDER.indexOf(risk.level) <= RISK_ORDER.indexOf(before)) continue
    if (risk.level === 'SAFE') continue

    const f = fc.byZone.get(z.id)
    const top = risk.factors[0]
    const second = risk.factors[1]
    const reason = `${top.label} (${top.share}%) and ${second.label.toLowerCase()} (${second.share}%)`

    let message: string
    if (risk.level === 'FLOODED') {
      message = `${z.name} has exceeded its flood threshold (${z.waterLevel.toFixed(2)} m / ${z.floodThreshold.toFixed(2)} m).`
    } else if (risk.level === 'CRITICAL') {
      const tf = f && Number.isFinite(f.minutesToFlood) ? formatDuration(f.minutesToFlood) : null
      message = tf
        ? `${z.name} is CRITICAL — projected to flood in ${tf}.`
        : `${z.name} is CRITICAL at ${(risk.waterRatio * 100).toFixed(0)}% of flood threshold.`
    } else {
      const tc = f && Number.isFinite(f.minutesToCritical) && f.minutesToCritical > 0 ? formatDuration(f.minutesToCritical) : null
      message = tc
        ? `${z.name} projected to reach critical water level in ${tc}.`
        : `${z.name} entered ${risk.level} — drains at ${Math.round(z.drainageUtilization * 100)}% load, water at ${(risk.waterRatio * 100).toFixed(0)}% of threshold.`
    }

    alerts.push({
      id: `${z.id}-${risk.level}-${next.tick}`,
      minutes: next.minutes,
      zoneId: z.id,
      zoneName: z.name,
      level: risk.level,
      message,
      reason,
    })
  }
  // most severe first
  alerts.sort((a, b) => RISK_ORDER.indexOf(b.level) - RISK_ORDER.indexOf(a.level))
  return alerts
}

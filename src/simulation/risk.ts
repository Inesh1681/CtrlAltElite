import type { RiskLevel, Zone } from './types'

export interface RiskFactor {
  key: 'water' | 'rain' | 'drainage' | 'elevation' | 'inflow'
  label: string
  /** weighted contribution 0..1 */
  value: number
  /** share of total risk, percent (sums to ~100) */
  share: number
}

export interface RiskAssessment {
  /** 0..1 composite score */
  score: number
  level: RiskLevel
  factors: RiskFactor[]
  /** water level as fraction of flood threshold */
  waterRatio: number
}

const WEIGHTS = { water: 0.45, rain: 0.15, drainage: 0.15, elevation: 0.1, inflow: 0.15 } as const

/** rainfall considered "extreme" for normalisation, mm/h */
export const RAIN_NORM = 120
/** inflow per tick considered "high", metres */
export const INFLOW_NORM = 0.02
export const ELEV_MIN = 2
export const ELEV_RANGE = 30

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

export function computeRisk(z: Zone): RiskAssessment {
  const waterRatio = z.waterLevel / z.floodThreshold
  const water = clamp01(waterRatio)
  const rain = clamp01(z.rainfallIntensity / RAIN_NORM)
  const drainage = clamp01(z.drainageUtilization)
  const elevation = clamp01(1 - (z.elevation - ELEV_MIN) / ELEV_RANGE)
  const inflow = clamp01(z.inflow / INFLOW_NORM)

  const parts: RiskFactor[] = [
    { key: 'water', label: 'Standing water', value: WEIGHTS.water * water, share: 0 },
    { key: 'rain', label: 'Rainfall', value: WEIGHTS.rain * rain, share: 0 },
    { key: 'drainage', label: 'Drainage load', value: WEIGHTS.drainage * drainage, share: 0 },
    { key: 'elevation', label: 'Low elevation', value: WEIGHTS.elevation * elevation, share: 0 },
    { key: 'inflow', label: 'Upstream flow', value: WEIGHTS.inflow * inflow, share: 0 },
  ]
  const score = parts.reduce((s, p) => s + p.value, 0)
  for (const p of parts) p.share = score > 0 ? Math.round((p.value / score) * 100) : 0
  parts.sort((a, b) => b.value - a.value)

  return { score, level: levelFor(score, waterRatio), factors: parts, waterRatio }
}

export function levelFor(score: number, waterRatio: number): RiskLevel {
  if (waterRatio >= 1) return 'FLOODED'
  if (waterRatio >= 0.75 || score >= 0.85) return 'CRITICAL'
  if (waterRatio >= 0.5 || score >= 0.65) return 'WARNING'
  if (waterRatio >= 0.25 || score >= 0.45) return 'WATCH'
  return 'SAFE'
}

export const CRITICAL_RATIO = 0.75

export function isHighRisk(level: RiskLevel): boolean {
  return level === 'WARNING' || level === 'CRITICAL' || level === 'FLOODED'
}

export function inflowLabel(inflowMetres: number): 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' {
  if (inflowMetres < 0.001) return 'NONE'
  if (inflowMetres < INFLOW_NORM * 0.35) return 'LOW'
  if (inflowMetres < INFLOW_NORM * 0.75) return 'MODERATE'
  return 'HIGH'
}

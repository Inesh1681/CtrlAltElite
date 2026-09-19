import type { RiskLevel } from '../simulation/types'

export const RISK_COLOR: Record<RiskLevel, string> = {
  SAFE: '#3ddc97',
  WATCH: '#f5c451',
  WARNING: '#f2913d',
  CRITICAL: '#ff4d4d',
  FLOODED: '#ff2d6f',
}

export const RISK_BG: Record<RiskLevel, string> = {
  SAFE: 'rgba(61,220,151,0.12)',
  WATCH: 'rgba(245,196,81,0.14)',
  WARNING: 'rgba(242,145,61,0.16)',
  CRITICAL: 'rgba(255,77,77,0.18)',
  FLOODED: 'rgba(255,45,111,0.2)',
}

export function pct(v: number, digits = 0): string {
  return `${(v * 100).toFixed(digits)}%`
}

export function metres(v: number, digits = 2): string {
  return `${v.toFixed(digits)} m`
}

export function mmh(v: number): string {
  return `${Math.round(v)} mm/h`
}

/** elevation → terrain colour (low = dark blue-grey basin, high = pale olive ridge) */
export function terrainColor(elev: number, min = 2, max = 32): string {
  const t = Math.max(0, Math.min(1, (elev - min) / (max - min)))
  const lo = [20, 30, 44]
  const mid = [36, 46, 56]
  const hi = [78, 84, 70]
  const mix = (a: number[], b: number[], u: number) => a.map((x, i) => Math.round(x + (b[i] - x) * u))
  const c = t < 0.5 ? mix(lo, mid, t / 0.5) : mix(mid, hi, (t - 0.5) / 0.5)
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

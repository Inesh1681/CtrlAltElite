import type { RainfallProfile } from './types'

/** smooth ramp: value at t between (t0,v0) and (t1,v1) */
function lerp(t: number, t0: number, v0: number, t1: number, v1: number): number {
  if (t <= t0) return v0
  if (t >= t1) return v1
  const u = (t - t0) / (t1 - t0)
  const s = u * u * (3 - 2 * u) // smoothstep
  return v0 + (v1 - v0) * s
}

/** piecewise profile from (minute, mm/h) keypoints */
export function piecewise(points: Array<[number, number]>): (t: number) => number {
  return (t: number) => {
    if (points.length === 0) return 0
    if (t <= points[0][0]) return points[0][1]
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) return lerp(t, points[i - 1][0], points[i - 1][1], points[i][0], points[i][1])
    }
    return points[points.length - 1][1]
  }
}

export const NORMAL_RAIN: RainfallProfile = {
  id: 'normal',
  name: 'NORMAL RAIN',
  description: 'Steady seasonal rain, ~18–26 mm/h. Drains keep up; a few low districts reach WATCH.',
  intensityAt: piecewise([
    [0, 12],
    [30, 22],
    [120, 26],
    [180, 18],
    [240, 10],
    [300, 4],
  ]),
  source: 'synthetic',
}

export const HEAVY_MONSOON: RainfallProfile = {
  id: 'monsoon',
  name: 'HEAVY MONSOON',
  description: 'Three-hour monsoon band peaking near 110 mm/h. Low-lying and downstream districts overwhelm their drains.',
  intensityAt: piecewise([
    [0, 20],
    [30, 60],
    [75, 105],
    [135, 110],
    [180, 85],
    [225, 50],
    [270, 20],
    [330, 5],
  ]),
  source: 'synthetic',
}

export const EXTREME_STORM: RainfallProfile = {
  id: 'extreme',
  name: 'EXTREME STORM',
  description: 'Convective cell peaking at 150 mm/h. Rapid, city-wide inundation of the valley and harbour.',
  intensityAt: piecewise([
    [0, 35],
    [20, 95],
    [50, 150],
    [90, 140],
    [130, 90],
    [180, 45],
    [240, 15],
  ]),
  source: 'synthetic',
}

export const SCENARIOS: RainfallProfile[] = [NORMAL_RAIN, HEAVY_MONSOON, EXTREME_STORM]

export function customProfile(mmPerHour: number): RainfallProfile {
  return {
    id: 'custom',
    name: 'CUSTOM',
    description: `Constant ${Math.round(mmPerHour)} mm/h.`,
    intensityAt: () => mmPerHour,
    source: 'synthetic',
  }
}

/** Build a profile from hourly precipitation totals (mm per hour), e.g. an Open-Meteo forecast. */
export function profileFromHourly(hourlyMm: number[], label: string): RainfallProfile {
  const pts: Array<[number, number]> = hourlyMm.map((mm, i) => [i * 60 + 30, mm])
  return {
    id: 'weather',
    name: label,
    description: `Live forecast, ${hourlyMm.length}h of hourly precipitation.`,
    intensityAt: piecewise(pts.length ? pts : [[0, 0]]),
    source: 'open-meteo',
  }
}

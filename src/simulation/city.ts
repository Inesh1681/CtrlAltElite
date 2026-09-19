import type { ZoneStatic } from './types'

/**
 * Synthetic city: an 8 x 6 grid of districts.
 * Terrain: hills to the north-west and south-east, a river valley running west→east
 * that bends south, and a low harbour basin in the south-east corner.
 * Everything is generated from closed-form functions + a seeded hash, so the
 * city is byte-for-byte identical on every load.
 */

export const GRID_COLS = 8
export const GRID_ROWS = 6

export const TERRAIN_SOURCE = 'SYNTHETIC TERRAIN' as const

/** district names for the synthetic twin — a generic Indian river city with a harbour */
const NAMES: string[] = [
  'Pahadganj', 'Vidya Nagar', 'Ashok Vihar', 'Shivaji Nagar', 'Gandhi Nagar', 'Nehru Colony', 'Indira Puram', 'Shastri Nagar',
  'Rajendra Nagar', 'Sunder Bagh', 'Mill Line', 'Sadar Bazaar', 'Nadi Kinara', 'Ghat Road', 'Tilak Marg', 'Vasant Nagar',
  'Bhagat Tola', 'Purana Shahar', 'Railway Colony', 'Junction Station', 'Nahar Road', 'Bandar Road', 'Dockyard', 'Ganga Vihar',
  'Model Town', 'Lohia Chowk', 'Chamda Mandi', 'Civil Lines', 'Bela Colony', 'Talab Para', 'Bandargah', 'Namak Tola',
  'Chir Bagh', 'Ambedkar Nagar', 'Lohakhana', 'Dakshin Tat', 'Bargad Mor', 'Sarkanda Tola', 'Samudra Tat', 'Purva Bandar',
  'Shikhar Park', 'Tila Colony', 'Prakash Nagar', 'Ghati Mohalla', 'Kanta Tola', 'Kai Nagar', 'Jetty Road', 'Sagar Kinara',
]

/** deterministic hash → [0,1) */
function hash01(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 1442695041) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** river centre line: row as a function of column (continuous) */
function riverRow(col: number): number {
  // starts mid-north, bends south-east toward the harbour basin
  return 1.6 + 0.55 * col * (col / GRID_COLS) + 0.35 * Math.sin(col * 0.9)
}

export function elevationAt(col: number, row: number): number {
  const dRiver = Math.abs(row - riverRow(col))
  // valley profile: low near the river, climbing away from it
  let elev = 4 + 26 * Math.min(1, dRiver / 3.2) ** 1.25
  // harbour basin in the south-east corner
  const dBasin = Math.hypot(col - 6.5, row - 4.8)
  elev -= 9 * Math.max(0, 1 - dBasin / 2.6)
  // north-west hills
  const dHill = Math.hypot(col - 0.5, row - 0.2)
  elev += 8 * Math.max(0, 1 - dHill / 3.5)
  // small deterministic roughness
  elev += (hash01(col, row, 7) - 0.5) * 1.6
  return Math.max(2, Math.round(elev * 10) / 10)
}

/**
 * Hydrological pit filling: raise any zone that sits below all of its neighbours
 * (and is not a sea outlet) so every zone has a strictly downhill path to the harbour.
 * This is the standard "fill sinks" pre-processing step used on real DEMs.
 */
export function fillPits(elev: number[], outlet: boolean[]): number[] {
  const e = elev.slice()
  const step = 0.3
  for (let iter = 0; iter < 200; iter++) {
    let changed = false
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const i = row * GRID_COLS + col
        if (outlet[i]) continue
        let minNb = Infinity
        if (col > 0) minNb = Math.min(minNb, e[i - 1])
        if (col < GRID_COLS - 1) minNb = Math.min(minNb, e[i + 1])
        if (row > 0) minNb = Math.min(minNb, e[i - GRID_COLS])
        if (row < GRID_ROWS - 1) minNb = Math.min(minNb, e[i + GRID_COLS])
        if (e[i] <= minNb) {
          e[i] = Math.round((minNb + step) * 10) / 10
          changed = true
        }
      }
    }
    if (!changed) break
  }
  return e
}

function landUseAt(col: number, row: number, elev: number): ZoneStatic['landUse'] {
  if (elev < 6) return 'waterfront'
  const h = hash01(col, row, 11)
  if (row >= 2 && row <= 3 && col >= 2 && col <= 5) return h < 0.7 ? 'commercial' : 'residential'
  if (elev < 11 && h < 0.4) return 'industrial'
  if (h > 0.86) return 'park'
  return 'residential'
}

export function generateCity(): ZoneStatic[] {
  const zones: ZoneStatic[] = []
  const rawElev: number[] = []
  const outlet: boolean[] = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const e = elevationAt(col, row)
      rawElev.push(e)
      outlet.push(e <= 2.5)
    }
  }
  const filled = fillPits(rawElev, outlet)

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const idx = row * GRID_COLS + col
      const elevation = filled[idx]
      const landUse = landUseAt(col, row, elevation)
      const lowness = 1 - Math.min(1, (elevation - 2) / 30)

      // dense low districts concentrate runoff; parks soak it up
      const catchmentBase =
        landUse === 'park' ? 1.3 : landUse === 'commercial' ? 3.0 : landUse === 'industrial' ? 2.6 : landUse === 'waterfront' ? 2.6 : 2.1
      const catchmentFactor = Math.round((catchmentBase + lowness * 0.6 + (hash01(col, row, 3) - 0.5) * 0.4) * 100) / 100

      // drainage capacity in mm/h of standing water the drains can remove at design load.
      // older low districts have weaker drains; newer high districts better
      const drainBase = landUse === 'commercial' ? 95 : landUse === 'waterfront' ? 68 : landUse === 'industrial' ? 80 : landUse === 'park' ? 120 : 90
      const drainageCapacity = Math.round(drainBase + (1 - lowness) * 25 + (hash01(col, row, 5) - 0.5) * 16)

      const floodThreshold = landUse === 'waterfront' ? 0.7 : elevation < 9 ? 0.8 : 1.0
      const initialWaterLevel = Math.round((elevation < 8 ? 0.08 + hash01(col, row, 9) * 0.06 : hash01(col, row, 9) * 0.03) * 100) / 100

      // storm cell heavier over the centre-east
      const rainFactor = Math.round((0.86 + 0.3 * Math.exp(-(((col - 4.5) / 3.2) ** 2 + ((row - 2.2) / 2.6) ** 2))) * 100) / 100

      const neighbors: string[] = []
      if (col > 0) neighbors.push(zoneId(idx - 1))
      if (col < GRID_COLS - 1) neighbors.push(zoneId(idx + 1))
      if (row > 0) neighbors.push(zoneId(idx - GRID_COLS))
      if (row < GRID_ROWS - 1) neighbors.push(zoneId(idx + GRID_COLS))

      zones.push({
        id: zoneId(idx),
        name: NAMES[idx] ?? `District ${idx + 1}`,
        col,
        row,
        elevation,
        rainFactor,
        catchmentFactor,
        drainageCapacity,
        floodThreshold,
        initialWaterLevel,
        neighbors,
        isOutlet: outlet[idx],
        // the river enters from the west edge: the col-0 cell(s) nearest the river line
        isInlet: col === 0 && Math.abs(row - riverRow(0)) < 1,
        landUse,
      })
    }
  }
  return zones
}

export function zoneId(idx: number): string {
  return `Z${String(idx + 1).padStart(2, '0')}`
}

/** polyline of the river centre in grid units (for drawing only) */
export function riverPath(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  for (let c = -0.5; c <= GRID_COLS + 0.5; c += 0.25) {
    pts.push({ x: c + 0.5, y: riverRow(c) + 0.5 })
  }
  return pts
}

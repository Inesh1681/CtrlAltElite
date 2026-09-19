import type { SimParams, Zone } from './types'

export interface FlowResult {
  /** metres leaving each zone (by index) */
  outflow: Float64Array
  /** metres arriving at each zone (by index) */
  inflow: Float64Array
  /** neighbour id receiving the largest share of each zone's outflow */
  dominantTo: (string | null)[]
}

/**
 * Inter-zone surface flow.
 * Water moves from a zone with a higher effective water surface (elevation + depth)
 * to lower neighbours. Flow is proportional to the head difference, capped so that
 * at most `maxOutflowFraction` of a zone's water leaves in a single tick.
 * All flows are computed from the start-of-tick state (synchronous update), so the
 * result does not depend on zone ordering.
 */
export function computeFlows(zones: Zone[], params: SimParams): FlowResult {
  const n = zones.length
  const index = new Map<string, number>()
  zones.forEach((z, i) => index.set(z.id, i))

  const outflow = new Float64Array(n)
  const inflow = new Float64Array(n)
  const dominantTo: (string | null)[] = new Array(n).fill(null)

  for (let i = 0; i < n; i++) {
    const z = zones[i]
    if (z.waterLevel <= 1e-6) continue
    const head = z.elevation + z.waterLevel

    const targets: Array<{ j: number; want: number }> = []
    let wantTotal = 0
    for (const nid of z.neighbors) {
      const j = index.get(nid)
      if (j === undefined) continue
      const nb = zones[j]
      const diff = head - (nb.elevation + nb.waterLevel)
      if (diff <= 0) continue
      // never push more than half the head difference (prevents oscillation)
      const want = Math.min(diff * params.conductance, diff * 0.5)
      targets.push({ j, want })
      wantTotal += want
    }
    if (wantTotal <= 0) continue

    const available = z.waterLevel * params.maxOutflowFraction
    const scale = Math.min(1, available / wantTotal)

    let best = -1
    let bestAmt = 0
    for (const t of targets) {
      const amt = t.want * scale
      outflow[i] += amt
      inflow[t.j] += amt
      if (amt > bestAmt) {
        bestAmt = amt
        best = t.j
      }
    }
    if (best >= 0) dominantTo[i] = zones[best].id
  }

  return { outflow, inflow, dominantTo }
}

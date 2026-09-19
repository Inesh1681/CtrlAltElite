import { describe, expect, it } from 'vitest'
import { diffAlerts } from './alerts'
import { generateCity, GRID_COLS, GRID_ROWS } from './city'
import { createInitialState, DEFAULT_PARAMS, step } from './engine'
import { computeFlows } from './flow'
import { forecast } from './forecast'
import { computeRisk, levelFor } from './risk'
import { customProfile, HEAVY_MONSOON, NORMAL_RAIN, UPSTREAM_SURGE } from './scenarios'
import type { SimParams } from './types'
import { compareDrainage } from './whatif'

const city = generateCity()
const NO_RAIN = customProfile(0)
const NO_DRAIN: SimParams = { ...DEFAULT_PARAMS, drainageMultiplier: 0, outletFraction: 0 }

describe('city generation', () => {
  it('produces a full grid with unique ids and valid neighbours', () => {
    expect(city).toHaveLength(GRID_COLS * GRID_ROWS)
    const ids = new Set(city.map((z) => z.id))
    expect(ids.size).toBe(city.length)
    for (const z of city) for (const n of z.neighbors) expect(ids.has(n)).toBe(true)
  })

  it('has no closed pits: every non-outlet zone has a strictly lower neighbour', () => {
    const byId = new Map(city.map((z) => [z.id, z]))
    for (const z of city) {
      if (z.isOutlet) continue
      const lower = z.neighbors.some((n) => byId.get(n)!.elevation < z.elevation)
      expect(lower, `${z.id} ${z.name} has no downhill neighbour`).toBe(true)
    }
    expect(city.some((z) => z.isOutlet)).toBe(true)
  })

  it('is deterministic', () => {
    expect(JSON.stringify(generateCity())).toBe(JSON.stringify(city))
  })
})

describe('engine', () => {
  it('is deterministic and reproducible', () => {
    const run = () => {
      let s = createInitialState(city)
      for (let i = 0; i < 40; i++) s = step(s, DEFAULT_PARAMS, HEAVY_MONSOON)
      return s.zones.map((z) => z.waterLevel)
    }
    expect(run()).toEqual(run())
  })

  it('does not mutate the previous state', () => {
    const s0 = createInitialState(city)
    const before = JSON.stringify(s0.zones)
    step(s0, DEFAULT_PARAMS, HEAVY_MONSOON)
    expect(JSON.stringify(s0.zones)).toBe(before)
  })

  it('conserves water when there is no rain, drainage or outlet', () => {
    let s = createInitialState(city)
    const total = (st: typeof s) => st.zones.reduce((a, z) => a + z.waterLevel, 0)
    const t0 = total(s)
    for (let i = 0; i < 30; i++) s = step(s, NO_DRAIN, NO_RAIN)
    expect(total(s)).toBeCloseTo(t0, 9)
  })

  it('moves water from higher to lower zones only', () => {
    const s = createInitialState(city)
    const zones = s.zones.map((z) => ({ ...z, waterLevel: 0.5 }))
    const flows = computeFlows(zones, DEFAULT_PARAMS)
    // the highest zone should receive nothing, the outlet should send nothing uphill
    const highest = zones.reduce((a, z, i) => (z.elevation > zones[a].elevation ? i : a), 0)
    expect(flows.inflow[highest]).toBe(0)
    for (let i = 0; i < zones.length; i++) {
      expect(flows.outflow[i]).toBeLessThanOrEqual(zones[i].waterLevel * DEFAULT_PARAMS.maxOutflowFraction + 1e-12)
    }
  })

  it('accumulates more water in low zones than high zones under uniform rain', () => {
    let s = createInitialState(city)
    for (let i = 0; i < 24; i++) s = step(s, NO_DRAIN, customProfile(60))
    const sorted = [...s.zones].sort((a, b) => a.elevation - b.elevation)
    const lowAvg = sorted.slice(0, 8).reduce((a, z) => a + z.waterLevel, 0) / 8
    const highAvg = sorted.slice(-8).reduce((a, z) => a + z.waterLevel, 0) / 8
    expect(lowAvg).toBeGreaterThan(highAvg * 3)
  })

  it('rain increases water; drainage reduces it', () => {
    let wet = createInitialState(city)
    let drained = createInitialState(city)
    for (let i = 0; i < 12; i++) {
      wet = step(wet, NO_DRAIN, customProfile(80))
      drained = step(drained, DEFAULT_PARAMS, customProfile(80))
    }
    const sum = (st: typeof wet) => st.zones.reduce((a, z) => a + z.waterLevel, 0)
    expect(sum(wet)).toBeGreaterThan(sum(createInitialState(city)))
    expect(sum(drained)).toBeLessThan(sum(wet))
  })

  it('keeps water levels non-negative and finite', () => {
    let s = createInitialState(city)
    for (let i = 0; i < 80; i++) {
      s = step(s, { ...DEFAULT_PARAMS, drainageMultiplier: 2 }, HEAVY_MONSOON)
      for (const z of s.zones) {
        expect(z.waterLevel).toBeGreaterThanOrEqual(0)
        expect(Number.isFinite(z.waterLevel)).toBe(true)
      }
    }
  })
})

describe('risk', () => {
  it('maps water ratio to escalating levels', () => {
    expect(levelFor(0, 0)).toBe('SAFE')
    expect(levelFor(0, 0.3)).toBe('WATCH')
    expect(levelFor(0, 0.55)).toBe('WARNING')
    expect(levelFor(0, 0.8)).toBe('CRITICAL')
    expect(levelFor(0, 1.0)).toBe('FLOODED')
  })

  it('factor shares sum to ~100%', () => {
    let s = createInitialState(city)
    for (let i = 0; i < 12; i++) s = step(s, DEFAULT_PARAMS, HEAVY_MONSOON)
    for (const z of s.zones) {
      const r = computeRisk(z)
      const sum = r.factors.reduce((a, f) => a + f.share, 0)
      expect(Math.abs(sum - 100)).toBeLessThanOrEqual(3)
    }
  })

  it('normal rain never floods the city; heavy monsoon does', () => {
    let a = createInitialState(city)
    let b = createInitialState(city)
    let floodedNormal = 0
    let floodedMonsoon = 0
    for (let i = 0; i < 48; i++) {
      a = step(a, DEFAULT_PARAMS, NORMAL_RAIN)
      b = step(b, DEFAULT_PARAMS, HEAVY_MONSOON)
      floodedNormal = Math.max(floodedNormal, a.history[a.history.length - 1].floodedCount)
      floodedMonsoon = Math.max(floodedMonsoon, b.history[b.history.length - 1].floodedCount)
    }
    expect(floodedNormal).toBe(0)
    expect(floodedMonsoon).toBeGreaterThan(0)
  })
})

describe('upstream surge scenario', () => {
  it('floods the river corridor from the inlet while the hills stay safe', () => {
    let s = createInitialState(city)
    let firstFlooded: string | null = null
    for (let i = 0; i < 48; i++) {
      s = step(s, DEFAULT_PARAMS, UPSTREAM_SURGE)
      if (!firstFlooded) {
        const f = s.zones.find((z) => z.waterLevel >= z.floodThreshold)
        if (f) firstFlooded = f.id
      }
    }
    // the first district to flood is an inlet cell (the wave arrives from outside)
    const inletIds = city.filter((z) => z.isInlet).map((z) => z.id)
    expect(firstFlooded).not.toBeNull()
    expect(inletIds).toContain(firstFlooded)
    // high ground is untouched
    const high = s.zones.filter((z) => z.elevation > 20)
    for (const z of high) expect(computeRisk(z).level).toBe('SAFE')
  })
})

describe('forecast, what-if and alerts', () => {
  it('projects a time-to-critical for at least one zone under monsoon', () => {
    const s = createInitialState(city)
    const fc = forecast(s, DEFAULT_PARAMS, HEAVY_MONSOON)
    expect(fc.firstCritical).not.toBeNull()
    expect(fc.firstCritical!.minutes).toBeGreaterThan(0)
  })

  it('more drainage never makes a zone critical sooner', () => {
    let s = createInitialState(city)
    for (let i = 0; i < 6; i++) s = step(s, DEFAULT_PARAMS, HEAVY_MONSOON)
    const fc = forecast(s, DEFAULT_PARAMS, HEAVY_MONSOON)
    for (const z of s.zones) {
      const r = compareDrainage(s, DEFAULT_PARAMS, HEAVY_MONSOON, z.id, 1.5)
      expect(r.scenarioMinutes).toBeGreaterThanOrEqual(r.baselineMinutes)
      expect(r.baselineMinutes).toBe(fc.byZone.get(z.id)!.minutesToCritical)
    }
    const first = compareDrainage(s, DEFAULT_PARAMS, HEAVY_MONSOON, fc.firstCritical!.zoneId, 1.5)
    expect(first.delayMinutes).toBeGreaterThan(0)
  })

  it('raises alerts when zones escalate', () => {
    let prev = createInitialState(city)
    let raised = 0
    for (let i = 0; i < 30; i++) {
      const next = step(prev, DEFAULT_PARAMS, HEAVY_MONSOON)
      const fc = forecast(next, DEFAULT_PARAMS, HEAVY_MONSOON, 12)
      const alerts = diffAlerts(prev, next, fc)
      raised += alerts.length
      for (const a of alerts) {
        expect(a.message).toContain(a.zoneName)
        expect(a.minutes).toBe(next.minutes)
      }
      prev = next
    }
    expect(raised).toBeGreaterThan(0)
  })
})

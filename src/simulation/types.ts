/**
 * FLOWSHIELD simulation types.
 * The simulation engine is the single source of truth for every number shown in the UI.
 */

export type RiskLevel = 'SAFE' | 'WATCH' | 'WARNING' | 'CRITICAL' | 'FLOODED'

export const RISK_ORDER: RiskLevel[] = ['SAFE', 'WATCH', 'WARNING', 'CRITICAL', 'FLOODED']

export interface ZoneStatic {
  id: string
  name: string
  /** grid column / row */
  col: number
  row: number
  /** metres above datum */
  elevation: number
  /** local rainfall multiplier (storm cell shape), ~0.8 – 1.2 */
  rainFactor: number
  /** how strongly runoff concentrates into this zone (urban density), ~2 – 5 */
  catchmentFactor: number
  /** mm/h of standing water the storm drains can remove at design load (100%) */
  drainageCapacity: number
  /** metres of standing water at which the zone is considered flooded */
  floodThreshold: number
  /** metres of standing water before the storm */
  initialWaterLevel: number
  /** ids of orthogonally connected zones */
  neighbors: string[]
  /** true for harbour cells that discharge directly to the sea */
  isOutlet: boolean
  /** true for the cells where the river enters the city (receive upstream surge) */
  isInlet: boolean
  landUse: 'residential' | 'commercial' | 'industrial' | 'park' | 'waterfront'
}

export interface ZoneDynamic {
  /** metres of standing water */
  waterLevel: number
  /** current effective rainfall on this zone, mm/h */
  rainfallIntensity: number
  /** metres moved in from higher neighbours this tick */
  inflow: number
  /** metres moved out to lower neighbours this tick */
  outflow: number
  /** metres removed by drainage this tick */
  drained: number
  /** metres discharged to the sea this tick (outlet zones only) */
  seaDischarge: number
  /** 0..1+ share of drainage capacity in use */
  drainageUtilization: number
  /** dominant outflow direction (neighbour id) or null */
  dominantOutflowTo: string | null
}

export type Zone = ZoneStatic & ZoneDynamic

export interface SimParams {
  /** simulated minutes per tick */
  dtMinutes: number
  /** global multiplier applied to scenario rainfall (custom rainfall control) */
  rainfallMultiplier: number
  /** global multiplier on every zone's drainage capacity (what-if lever). 1 = design capacity */
  drainageMultiplier: number
  /** fraction of head difference equalised per tick between neighbours */
  conductance: number
  /** max fraction of a zone's water that may leave to neighbours in one tick */
  maxOutflowFraction: number
  /** fraction of an outlet zone's water discharged to the sea each tick */
  outletFraction: number
}

export interface RainfallProfile {
  id: string
  name: string
  description: string
  /** rainfall in mm/h at simulated minute t */
  intensityAt: (minutes: number) => number
  /**
   * optional external river inflow arriving at the inlet cells, expressed as an
   * equivalent depth rate (mm/h) added to each inlet cell — e.g. a barrage release
   * or a flood wave from upstream of the city
   */
  upstreamSurgeAt?: (minutes: number) => number
  /** true when the profile comes from a live forecast */
  source: 'synthetic' | 'open-meteo'
}

export interface SimSnapshot {
  tick: number
  minutes: number
  avgWater: number
  maxWater: number
  rainfall: number
  avgDrainageUtil: number
  highRiskCount: number
  floodedCount: number
}

export interface SimState {
  tick: number
  minutes: number
  zones: Zone[]
  history: SimSnapshot[]
}

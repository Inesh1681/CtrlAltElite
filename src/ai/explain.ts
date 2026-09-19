import Anthropic from '@anthropic-ai/sdk'
import { formatDuration, formatSimTime } from '../simulation/engine'
import type { Forecast } from '../simulation/forecast'
import { computeRisk, inflowLabel, isHighRisk } from '../simulation/risk'
import type { RainfallProfile, SimParams, SimState, Zone } from '../simulation/types'
import type { WhatIfResult } from '../simulation/whatif'

/**
 * AI explanation layer.
 * The simulation engine is the source of truth: we serialise a compact, structured
 * summary of the current state and ask the model to interpret it. The model is
 * told not to invent numbers. If no API key is configured (or the call fails),
 * a deterministic rule-based explainer produces the same sections.
 */

export interface ExplainInput {
  state: SimState
  params: SimParams
  profile: RainfallProfile
  forecast: Forecast
  focusZoneId: string | null
  whatIf: WhatIfResult | null
}

export interface Explanation {
  source: 'claude' | 'fallback'
  text: string
}

export const AI_ENABLED = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY)

/** Structured, model-facing summary of the state (this is the only data the model sees). */
export function buildStructuredState(input: ExplainInput) {
  const { state, params, profile, forecast: fc, focusZoneId, whatIf } = input
  const ranked = state.zones
    .map((z) => ({ z, r: computeRisk(z) }))
    .sort((a, b) => b.r.score - a.r.score)
  const top = ranked.slice(0, 6).map(({ z, r }) => zoneSummary(z, r, fc))
  const focus = focusZoneId ? ranked.find((x) => x.z.id === focusZoneId) : null
  const snap = state.history[state.history.length - 1]
  return {
    simTime: formatSimTime(state.minutes),
    scenario: profile.name,
    rainfallNow_mm_h: Math.round(snap.rainfall),
    drainageMultiplier: params.drainageMultiplier,
    cityAvgWater_m: Number(snap.avgWater.toFixed(3)),
    avgDrainageUtilization: Number(snap.avgDrainageUtil.toFixed(2)),
    counts: countLevels(state),
    firstZoneToGoCritical: fc.firstCritical
      ? { zone: zoneName(state, fc.firstCritical.zoneId), inMinutes: fc.firstCritical.minutes }
      : null,
    peakCriticalZonesWithin5h: fc.peakCritical,
    focusZone: focus ? zoneSummary(focus.z, focus.r, fc) : null,
    topRiskZones: top,
    whatIf: whatIf
      ? {
          zone: whatIf.zoneName,
          baselineDrainagePct: Math.round(whatIf.baselineDrainage * 100),
          scenarioDrainagePct: Math.round(whatIf.scenarioDrainage * 100),
          baselineCriticalIn: fmt(whatIf.baselineMinutes),
          scenarioCriticalIn: fmt(whatIf.scenarioMinutes),
          delay: fmt(whatIf.delayMinutes),
          peakCriticalBaseline: whatIf.baselineCriticalZones,
          peakCriticalScenario: whatIf.scenarioCriticalZones,
        }
      : null,
  }
}

function fmt(m: number): string {
  if (m === Infinity) return 'not within 5h'
  if (m === 0) return 'now'
  return formatDuration(m)
}

function zoneName(state: SimState, id: string): string {
  const z = state.zones.find((q) => q.id === id)
  return z ? `${z.id} ${z.name}` : id
}

function zoneSummary(z: Zone, r: ReturnType<typeof computeRisk>, fc: Forecast) {
  const f = fc.byZone.get(z.id)
  return {
    zone: `${z.id} ${z.name}`,
    level: r.level,
    riskScore: Math.round(r.score * 100),
    water_m: Number(z.waterLevel.toFixed(2)),
    threshold_m: z.floodThreshold,
    elevation_m: z.elevation,
    rainfall_mm_h: Math.round(z.rainfallIntensity),
    drainageUtilizationPct: Math.round(z.drainageUtilization * 100),
    upstreamInflow: inflowLabel(z.inflow),
    criticalIn: f ? fmt(f.minutesToCritical) : 'unknown',
    factors: r.factors.map((x) => `${x.label} ${x.share}%`),
  }
}

function countLevels(state: SimState): Record<string, number> {
  const c: Record<string, number> = { SAFE: 0, WATCH: 0, WARNING: 0, CRITICAL: 0, FLOODED: 0 }
  for (const z of state.zones) c[computeRisk(z).level]++
  return c
}

// ---------------------------------------------------------------------------
// Deterministic fallback explainer (rule based, uses only engine outputs)
// ---------------------------------------------------------------------------

export function fallbackExplanation(input: ExplainInput): Explanation {
  const s = buildStructuredState(input)
  const lines: string[] = []
  const focus = s.focusZone ?? s.topRiskZones[0]

  lines.push(`SITUATION — ${s.simTime} · ${s.scenario}`)
  const hr = s.counts.WARNING + s.counts.CRITICAL + s.counts.FLOODED
  if (hr === 0 && s.counts.WATCH === 0) {
    lines.push(`Rainfall is ${s.rainfallNow_mm_h} mm/h and every district is within normal limits. Drains are running at ${Math.round(s.avgDrainageUtilization * 100)}% average load.`)
  } else {
    lines.push(
      `Rainfall is ${s.rainfallNow_mm_h} mm/h. ${s.counts.FLOODED} flooded, ${s.counts.CRITICAL} critical, ${s.counts.WARNING} warning and ${s.counts.WATCH} on watch. Average drainage load is ${Math.round(s.avgDrainageUtilization * 100)}%.`,
    )
  }
  if (s.firstZoneToGoCritical) {
    lines.push(`Next projected escalation: ${s.firstZoneToGoCritical.zone} reaches critical in ${formatDuration(s.firstZoneToGoCritical.inMinutes)}.`)
  }

  if (focus) {
    lines.push('')
    lines.push(`WHY ${focus.zone.toUpperCase()} IS ${focus.level}`)
    const [f1, f2] = focus.factors
    const reasons: string[] = []
    if (focus.water_m / focus.threshold_m >= 0.5) reasons.push(`standing water is already ${focus.water_m} m of a ${focus.threshold_m} m threshold`)
    if (focus.drainageUtilizationPct >= 100) reasons.push(`its drains are overwhelmed (${focus.drainageUtilizationPct}% of capacity)`)
    else if (focus.drainageUtilizationPct >= 70) reasons.push(`drains are near capacity (${focus.drainageUtilizationPct}%)`)
    if (focus.upstreamInflow === 'HIGH' || focus.upstreamInflow === 'MODERATE') reasons.push(`it receives ${focus.upstreamInflow.toLowerCase()} inflow from higher districts`)
    if (focus.elevation_m <= 8) reasons.push(`at ${focus.elevation_m} m it sits at the bottom of the valley`)
    if (reasons.length === 0) reasons.push(`conditions are within limits; the dominant factor is ${f1.toLowerCase()}`)
    lines.push(`The leading factors are ${f1} and ${f2}. ` + capitalize(reasons.join(', ')) + '.')
    lines.push(`Projected critical: ${focus.criticalIn === 'now' ? 'already reached' : focus.criticalIn}.`)
  }

  lines.push('')
  lines.push('RECOMMENDED INTERVENTIONS')
  if (s.whatIf && s.whatIf.baselineCriticalIn !== 'now') {
    lines.push(
      `• Raising drainage from ${s.whatIf.baselineDrainagePct}% to ${s.whatIf.scenarioDrainagePct}% delays ${s.whatIf.zone} going critical by ${s.whatIf.delay === 'not within 5h' ? 'more than the 5 h horizon' : s.whatIf.delay} (${s.whatIf.baselineCriticalIn} → ${s.whatIf.scenarioCriticalIn}) and cuts peak critical zones from ${s.whatIf.peakCriticalBaseline} to ${s.whatIf.peakCriticalScenario}.`,
    )
  } else if (s.whatIf) {
    lines.push(`• ${s.whatIf.zone} is already critical; ${s.whatIf.scenarioDrainagePct}% drainage would still cut peak critical zones from ${s.whatIf.peakCriticalBaseline} to ${s.whatIf.peakCriticalScenario}.`)
  }
  if (focus && focus.upstreamInflow !== 'NONE' && focus.upstreamInflow !== 'LOW') {
    lines.push(`• Deploy pumps or open relief channels upstream of ${focus.zone} to reduce inflow — upstream flow contributes ${focus.factors.find((f) => f.startsWith('Upstream'))}.`)
  }
  if (hr > 0) lines.push('• Pre-position sandbags and issue evacuation advisories for CRITICAL and FLOODED districts; close low-lying roads.')
  if (hr === 0) lines.push('• No intervention required. Keep monitoring low-elevation districts as rainfall changes.')

  lines.push('')
  lines.push('MONITOR')
  const watch = s.topRiskZones.filter((z) => z.level !== 'FLOODED').slice(0, 3)
  lines.push(watch.map((z) => `${z.zone} (${z.level}, critical ${z.criticalIn === 'now' ? 'now' : z.criticalIn === 'not within 5h' ? 'not within 5h' : `in ${z.criticalIn}`})`).join(' · ') || 'No districts require monitoring.')

  return { source: 'fallback', text: lines.join('\n') }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------------------------------------------------------------------------
// Claude-backed explainer
// ---------------------------------------------------------------------------

const SYSTEM = `You are the analyst inside FLOWSHIELD, a flood early-warning command centre.
You receive a JSON snapshot produced by a deterministic flood simulation. That snapshot is the only source of truth.
Rules:
- Never invent, estimate or round differently any number that is not in the snapshot. Quote values exactly as given.
- Do not speculate about zones or data that are not present.
- Be concise and operational: plain sentences, no markdown headings other than the four uppercase section labels below, no bullet symbols other than "•".
Respond with exactly these sections, each on its own lines:
SITUATION — one or two sentences on the city-wide picture.
WHY <ZONE> IS <LEVEL> — explain the focus zone (or the top-risk zone if none) using its factors and numbers.
RECOMMENDED INTERVENTIONS — 2 to 3 bullets; if a what-if comparison is present, state its delay explicitly.
MONITOR — the zones that should be watched next and why, one line.`

let client: Anthropic | null = null
function getClient(): Anthropic | null {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!key) return null
  if (!client) client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 30_000 })
  return client
}

export async function explain(input: ExplainInput, signal?: AbortSignal): Promise<Explanation> {
  const c = getClient()
  if (!c) return fallbackExplanation(input)
  try {
    const snapshot = buildStructuredState(input)
    const response = await c.messages.create(
      {
        model: 'claude-opus-5',
        max_tokens: 1200,
        system: SYSTEM,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: `Simulation snapshot:\n${JSON.stringify(snapshot, null, 1)}` }],
      },
      { signal },
    )
    if (response.stop_reason === 'refusal') return fallbackExplanation(input)
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()
    if (!text) return fallbackExplanation(input)
    return { source: 'claude', text }
  } catch (err) {
    if (signal?.aborted) throw err
    console.warn('[FLOWSHIELD] AI explanation failed, using fallback:', err)
    return fallbackExplanation(input)
  }
}

export { isHighRisk }

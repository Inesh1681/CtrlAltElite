import { useMemo } from 'react'
import type { Simulation } from '../hooks/useSimulation'
import { RISK_COLOR } from '../lib/format'
import { formatDuration } from '../simulation/engine'
import { computeRisk, isHighRisk, type RiskFactor } from '../simulation/risk'
import { AlertsFeed } from './AlertsFeed'
import { CityMap, RiskLegend } from './CityMap'
import { TransportControls } from './Controls'
import { Kpis } from './Kpis'
import { Timeline, TimelineLegend, TimeScrubber } from './Timeline'
import { systemStatus } from './TopBar'
import { WhatIfStrip } from './WhatIfPanel'

export function CommandCenter({ sim }: { sim: Simulation }) {
  const status = systemStatus(sim)
  const ranked = useMemo(
    () =>
      sim.state.zones
        .map((z) => ({ z, r: computeRisk(z), f: sim.forecast.byZone.get(z.id) }))
        .filter((x) => x.r.level !== 'SAFE')
        .sort((a, b) => b.r.score - a.r.score),
    [sim.state.zones, sim.forecast],
  )
  const factors = useMemo(() => aggregateFactors(ranked.map((x) => x.r.factors)), [ranked])
  const interventions = useMemo(() => recommend(sim, ranked), [sim, ranked])

  return (
    <div className="grid h-full min-h-0 grid-cols-[290px_minmax(0,1fr)_300px] gap-2 p-2">
      {/* left column */}
      <div className="flex min-h-0 flex-col gap-2">
        <section className="panel p-3">
          <div className="label">System status</div>
          <div className="mono mt-1 text-[17px] font-bold leading-tight" style={{ color: RISK_COLOR[status.level] }}>
            {status.label}
          </div>
          <div className="mono mt-1 text-[10px] text-muted">
            {sim.profile.name} · {sim.profile.source === 'open-meteo' ? 'live forecast' : 'synthetic storm'} · drainage {Math.round(sim.params.drainageMultiplier * 100)}%
          </div>
          <div className="mt-3">
            <TransportControls sim={sim} />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <span className="label">What-if · drainage intervention</span>
          </div>
          <WhatIfStrip sim={sim} />
        </section>
        <section className="panel flex min-h-0 flex-1 flex-col">
          <div className="panel-head">
            <span className="label">Active alerts</span>
            <span className="mono text-[10px] text-muted">{sim.alerts.length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AlertsFeed alerts={sim.alerts} onSelect={sim.selectZone} />
          </div>
        </section>
      </div>

      {/* centre */}
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <Kpis sim={sim} columns={6} />
        <section className="panel flex min-h-0 flex-1 flex-col">
          <div className="panel-head">
            <span className="label">Flood map · water surface & propagation</span>
            <RiskLegend />
          </div>
          <div className="min-h-0 flex-1 p-1">
            <CityMap state={sim.state} blocked={sim.params.blockedZones} selectedZoneId={sim.selectedZoneId} onSelect={sim.selectZone} />
          </div>
        </section>
        <section className="panel flex h-[18vh] max-h-[160px] min-h-[110px] shrink-0 flex-col">
          <div className="panel-head py-1.5">
            <div className="flex items-center gap-4">
              <span className="label">Simulation timeline</span>
              <TimeScrubber tick={sim.state.tick} maxTick={sim.maxTick} onScrub={sim.scrubTo} />
            </div>
            <TimelineLegend />
          </div>
          <div className="min-h-0 flex-1">
            <Timeline history={sim.state.history} zonesTotal={sim.state.zones.length} />
          </div>
        </section>
      </div>

      {/* right column */}
      <div className="flex min-h-0 flex-col gap-2">
        <section className="panel flex min-h-0 flex-[1.2] flex-col">
          <div className="panel-head">
            <span className="label">High-risk zones</span>
            <span className="mono text-[10px] text-muted">{ranked.filter((x) => isHighRisk(x.r.level)).length}</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {ranked.length === 0 ? (
              <div className="p-3 text-[11px] text-muted">All districts nominal.</div>
            ) : (
              <ul className="divide-y divide-line">
                {ranked.slice(0, 10).map(({ z, r, f }) => (
                  <li key={z.id} className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-panel-2 ${sim.selectedZoneId === z.id ? 'bg-panel-2' : ''}`} onClick={() => sim.selectZone(z.id)}>
                    <span className="inline-block h-2 w-2 shrink-0 rounded-sm" style={{ background: RISK_COLOR[r.level] }} />
                    <span className="mono w-8 text-[10px] text-muted">{z.id}</span>
                    <span className="flex-1 truncate text-[11px]">{z.name}</span>
                    <span className="mono text-[10px]" style={{ color: RISK_COLOR[r.level] }}>
                      {r.level === 'FLOODED' ? 'FLOODED' : f && Number.isFinite(f.minutesToCritical) ? (f.minutesToCritical === 0 ? 'CRIT' : formatDuration(f.minutesToCritical)) : '—'}
                    </span>
                    <span className="mono w-12 text-right text-[10px] text-water">{z.waterLevel.toFixed(2)}m</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="panel p-3">
          <div className="label mb-2">Top contributing factors</div>
          {factors.length === 0 ? (
            <div className="text-[11px] text-muted">No elevated risk.</div>
          ) : (
            <div className="space-y-1.5">
              {factors.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="w-[100px] text-[11px] text-muted">{f.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded bg-line">
                    <div className="h-full bg-warning transition-all duration-500" style={{ width: `${f.share}%` }} />
                  </div>
                  <span className="mono w-9 text-right text-[11px]">{f.share}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel flex min-h-0 flex-1 flex-col">
          <div className="panel-head">
            <span className="label">Recommended interventions</span>
          </div>
          <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {interventions.map((t, i) => (
              <li key={i} className="flex gap-2 text-[11px] leading-snug">
                <span className="mono shrink-0 text-water">{String(i + 1).padStart(2, '0')}</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function aggregateFactors(all: RiskFactor[][]): Array<{ key: string; label: string; share: number }> {
  if (all.length === 0) return []
  const sum = new Map<string, { label: string; value: number }>()
  for (const factors of all)
    for (const f of factors) {
      const cur = sum.get(f.key) ?? { label: f.label, value: 0 }
      cur.value += f.value
      sum.set(f.key, cur)
    }
  const total = [...sum.values()].reduce((a, b) => a + b.value, 0) || 1
  return [...sum.entries()].map(([key, v]) => ({ key, label: v.label, share: Math.round((v.value / total) * 100) })).sort((a, b) => b.share - a.share)
}

function recommend(sim: Simulation, ranked: Array<{ z: Simulation['state']['zones'][number]; r: ReturnType<typeof computeRisk> }>): string[] {
  const out: string[] = []
  const w = sim.whatIf
  if (w && w.baselineMinutes > 0 && w.delayMinutes > 0) {
    out.push(
      `Raise drainage to ${Math.round(w.scenarioDrainage * 100)}% (pumps + cleared culverts): ${w.zoneName} goes critical ${w.delayMinutes === Infinity ? 'not at all within 5 h' : `${formatDuration(w.delayMinutes)} later`} and peak critical districts fall from ${w.baselineCriticalZones} to ${w.scenarioCriticalZones}.`,
    )
  } else if (w && w.baselineMinutes === 0 && w.scenarioCriticalZones < w.baselineCriticalZones) {
    out.push(`${w.zoneName} is already critical; ${Math.round(w.scenarioDrainage * 100)}% drainage still cuts peak critical districts from ${w.baselineCriticalZones} to ${w.scenarioCriticalZones}.`)
  }
  const flooded = ranked.filter((x) => x.r.level === 'FLOODED')
  const critical = ranked.filter((x) => x.r.level === 'CRITICAL')
  if (flooded.length) out.push(`Evacuate and close roads in ${flooded.map((x) => x.z.name).slice(0, 3).join(', ')}${flooded.length > 3 ? ` +${flooded.length - 3}` : ''}; deploy rescue teams to the harbour corridor.`)
  if (critical.length) out.push(`Pre-position sandbags and mobile pumps in ${critical.map((x) => x.z.name).slice(0, 3).join(', ')} before water reaches the flood threshold.`)
  const upstream = ranked.find((x) => x.r.factors[0]?.key === 'inflow' || x.r.factors[1]?.key === 'inflow')
  if (upstream) out.push(`Divert upstream runoff feeding ${upstream.z.name}: open relief channels on the higher districts to cut inflow.`)
  const watch = ranked.filter((x) => x.r.level === 'WATCH' || x.r.level === 'WARNING').slice(0, 3)
  if (watch.length) out.push(`Monitor ${watch.map((x) => x.z.name).join(', ')} — they are next in the flow path.`)
  if (out.length === 0) out.push('No intervention required. Maintain monitoring of low-elevation districts and the harbour basin.')
  return out.slice(0, 5)
}

import type { Simulation } from '../hooks/useSimulation'
import { formatDuration } from '../simulation/engine'

function fmtPeople(n: number): string {
  return n >= 100000 ? `${(n / 100000).toFixed(1)} L` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)
}

export function Kpis({ sim, columns = 4 }: { sim: Simulation; columns?: number }) {
  const snap = sim.state.history[sim.state.history.length - 1]
  const util = snap.avgDrainageUtil
  const next = sim.forecast.firstCritical
  const items = columns >= 6
    ? [
        { label: 'Rainfall', value: `${Math.round(snap.rainfall)}`, unit: 'mm/h', color: snap.rainfall > 60 ? '#f2913d' : undefined },
        { label: 'Avg water level', value: snap.avgWater.toFixed(3), unit: 'm', color: '#22d3ee' },
        { label: 'Drainage load', value: `${Math.round(util * 100)}`, unit: '%', color: util >= 0.95 ? '#ff4d4d' : util > 0.7 ? '#f5c451' : undefined },
        { label: 'High-risk zones', value: `${snap.highRiskCount}`, unit: `/ ${sim.state.zones.length}`, color: snap.highRiskCount > 0 ? '#f2913d' : '#3ddc97' },
        { label: 'People at risk', value: fmtPeople(snap.populationAtRisk), unit: `· ${fmtPeople(snap.populationFlooded)} in flooded`, color: snap.populationFlooded > 0 ? '#ff4d4d' : snap.populationAtRisk > 0 ? '#f2913d' : '#3ddc97' },
        {
          label: 'Next critical',
          value: next ? formatDuration(next.minutes) : '—',
          unit: next ? sim.state.zones.find((z) => z.id === next.zoneId)?.name ?? '' : 'none in 5h',
          color: next && next.minutes <= 60 ? '#ff4d4d' : next ? '#f5c451' : '#3ddc97',
        },
      ]
    : [
        { label: 'Rain right now', value: `${Math.round(snap.rainfall)}`, unit: 'mm/h', color: snap.rainfall > 60 ? '#f2913d' : undefined },
        { label: 'Drains under load', value: `${Math.round(util * 100)}`, unit: '% of capacity', color: util >= 0.95 ? '#ff4d4d' : util > 0.7 ? '#f5c451' : undefined },
        { label: 'People at risk', value: fmtPeople(snap.populationAtRisk), unit: `in ${snap.highRiskCount} districts · ${snap.floodedCount} flooded`, color: snap.floodedCount > 0 ? '#ff4d4d' : snap.highRiskCount > 0 ? '#f2913d' : '#3ddc97' },
        {
          label: 'Next district to go critical',
          value: next ? formatDuration(next.minutes) : 'none',
          unit: next ? sim.state.zones.find((z) => z.id === next.zoneId)?.name ?? '' : 'in the next 5 h',
          color: next && next.minutes <= 60 ? '#ff4d4d' : next ? '#f5c451' : '#3ddc97',
        },
      ]
  return (
    <div className="grid gap-px overflow-hidden rounded border border-line bg-line" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((k) => (
        <div key={k.label} className="bg-panel px-3 py-2">
          <div className="label text-[9px]">{k.label}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className={`mono font-semibold leading-none ${columns >= 6 ? 'text-[18px]' : 'text-[22px]'}`} style={{ color: k.color }}>
              {k.value}
            </span>
            <span className="mono truncate text-[10px] text-muted">{k.unit}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

import { CAN, useAuth } from '../auth/auth'
import type { Simulation } from '../hooks/useSimulation'
import { RISK_BG, RISK_COLOR } from '../lib/format'
import { formatDuration } from '../simulation/engine'
import { computeRisk, inflowLabel } from '../simulation/risk'

export function ZoneDetail({ sim }: { sim: Simulation }) {
  const { role } = useAuth()
  const z = sim.state.zones.find((q) => q.id === sim.selectedZoneId)
  if (!z) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted">
        <div className="label">Zone detail</div>
        <div className="text-[12px]">Click a district on the map to inspect water level, drainage load, inflow and the factors driving its risk.</div>
      </div>
    )
  }
  const r = computeRisk(z)
  const f = sim.forecast.byZone.get(z.id)
  const color = RISK_COLOR[r.level]
  const ttc = f?.minutesToCritical ?? Infinity
  const ttf = f?.minutesToFlood ?? Infinity
  const inflow = inflowLabel(z.inflow)
  const outflowTo = z.dominantOutflowTo ? sim.state.zones.find((q) => q.id === z.dominantOutflowTo) : null

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-line p-3" style={{ background: RISK_BG[r.level] }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="mono text-[10px] text-muted">
              {z.id} · {z.landUse.toUpperCase()}
              {z.isOutlet && ' · SEA OUTLET'}
              {z.isInlet && ' · RIVER INLET'}
            </div>
            <div className="text-[16px] font-semibold tracking-wide">{z.name.toUpperCase()}</div>
          </div>
          <div className="text-right">
            <div className="mono text-[14px] font-bold" style={{ color }}>
              {r.level}
            </div>
            <div className="mono text-[10px] text-muted">risk {Math.round(r.score * 100)}/100</div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label={r.level === 'FLOODED' ? 'Flooded since' : ttc === 0 ? 'Flood threshold in' : 'Critical threshold in'}
            value={r.level === 'FLOODED' ? 'NOW' : ttc === 0 ? (Number.isFinite(ttf) ? formatDuration(ttf) : '—') : Number.isFinite(ttc) ? formatDuration(ttc) : 'not in 5h'}
            color={ttc <= 60 ? '#ff4d4d' : Number.isFinite(ttc) ? '#f5c451' : '#3ddc97'} big />
          <Stat label="Water level" value={`${z.waterLevel.toFixed(2)} m`} sub={`/ ${z.floodThreshold.toFixed(2)} m`} color="#22d3ee" big />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-line">
          <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, r.waterRatio * 100)}%`, background: color }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 p-3">
        <Stat label="Elevation" value={`${z.elevation.toFixed(1)} m`} sub={`${z.population.toLocaleString('en-IN')} residents`} />
        <Stat label="Rainfall" value={`${Math.round(z.rainfallIntensity)} mm/h`} />
        <Stat label="Drainage" value={sim.params.blockedZones.includes(z.id) ? 'BLOCKED' : `${Math.round(z.drainageUtilization * 100)}%`} sub={sim.params.blockedZones.includes(z.id) ? 'channel blocked · 0 mm/h' : `of ${Math.round(z.drainageCapacity * sim.params.drainageMultiplier)} mm/h`} color={sim.params.blockedZones.includes(z.id) || z.drainageUtilization >= 1 ? '#ff4d4d' : undefined} />
        <Stat label="Upstream inflow" value={inflow} sub={`${(z.inflow * 1000).toFixed(1)} mm / tick`} color={inflow === 'HIGH' ? '#f2913d' : undefined} />
        <Stat label="Incoming flow" value={`+${(z.inflow * 100).toFixed(1)} cm`} sub="per 5 min" />
        <Stat label="Outgoing flow" value={`−${((z.outflow + z.seaDischarge) * 100).toFixed(1)} cm`} sub={outflowTo ? `→ ${outflowTo.name}` : z.isOutlet ? '→ sea' : 'none'} />
      </div>

      {CAN.changeParams(role) && (
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <div className="text-[10.5px] text-muted">Scenario: simulate a blocked drainage channel here</div>
          <button
            className={`btn h-6 px-2 text-[10px] ${sim.params.blockedZones.includes(z.id) ? 'border-critical text-critical' : ''}`}
            onClick={() => sim.toggleBlocked(z.id)}
          >
            {sim.params.blockedZones.includes(z.id) ? '⊘ Unblock drain' : '⊘ Block drain'}
          </button>
        </div>
      )}

      <div className="border-t border-line p-3">
        <div className="label mb-2">Why this zone is {r.level === 'SAFE' ? 'safe' : 'at risk'}</div>
        <div className="space-y-1.5">
          {r.factors.map((fac) => (
            <div key={fac.key} className="flex items-center gap-2">
              <span className="w-[104px] text-[11px] text-muted">{fac.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-line">
                <div className="h-full transition-all duration-500" style={{ width: `${fac.share}%`, background: color, opacity: 0.85 }} />
              </div>
              <span className="mono w-10 text-right text-[11px]">+{fac.share}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, color, big }: { label: string; value: string; sub?: string; color?: string; big?: boolean }) {
  return (
    <div>
      <div className="label text-[9px]">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`mono font-semibold ${big ? 'text-[17px]' : 'text-[13px]'}`} style={{ color }}>
          {value}
        </span>
        {sub && <span className="mono truncate text-[10px] text-muted">{sub}</span>}
      </div>
    </div>
  )
}

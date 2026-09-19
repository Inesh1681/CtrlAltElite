import type { Simulation } from '../hooks/useSimulation'
import { formatDuration } from '../simulation/engine'
import { Slider } from './Controls'

export function WhatIfPanel({ sim }: { sim: Simulation }) {
  const w = sim.whatIf
  const fmt = (m: number) => (m === Infinity ? 'not in 5h' : m === 0 ? 'now' : formatDuration(m))
  const delay = w ? (w.delayMinutes === Infinity ? 'AVERTED' : w.delayMinutes <= 0 ? '—' : `+${formatDuration(w.delayMinutes)}`) : '—'
  const delayColor = !w ? undefined : w.delayMinutes === Infinity ? '#3ddc97' : w.delayMinutes > 0 ? '#3ddc97' : '#8b95a7'
  const zoneAlready = w && w.baselineMinutes === 0

  return (
    <div className="space-y-3 p-3">
      <Slider
        label="Scenario drainage"
        value={sim.whatIfDrainage}
        min={0.6}
        max={2}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={sim.setWhatIfDrainage}
        accent="#3ddc97"
        hint={`current ${Math.round(sim.params.drainageMultiplier * 100)}% → scenario ${Math.round(sim.whatIfDrainage * 100)}% (${sim.whatIfDrainage >= sim.params.drainageMultiplier ? '+' : ''}${Math.round((sim.whatIfDrainage - sim.params.drainageMultiplier) * 100)} pts)`}
      />
      {w ? (
        <>
          <div className="mono text-[10px] text-muted">
            Target · {w.zoneId} {w.zoneName.toUpperCase()}
            {(!sim.selectedZoneId || sim.whatIfIsFallback) && <span className="text-dim"> (highest-leverage zone{sim.whatIfIsFallback ? ' — selected zone is already critical' : ''})</span>}
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line">
            <div className="bg-panel p-2.5">
              <div className="label text-[9px]">Without intervention</div>
              <div className="mono mt-1 text-[16px] font-semibold text-critical">{zoneAlready ? 'CRITICAL NOW' : `Critical in ${fmt(w.baselineMinutes)}`}</div>
              <div className="mono mt-1 text-[10px] text-muted">
                peak {w.baselinePeak.toFixed(2)} m · {w.baselineCriticalZones} peak critical zones
              </div>
            </div>
            <div className="bg-panel p-2.5">
              <div className="label text-[9px]">With {Math.round(w.scenarioDrainage * 100)}% drainage</div>
              <div className="mono mt-1 text-[16px] font-semibold text-safe">{w.scenarioMinutes === 0 ? 'CRITICAL NOW' : `Critical in ${fmt(w.scenarioMinutes)}`}</div>
              <div className="mono mt-1 text-[10px] text-muted">
                peak {w.scenarioPeak.toFixed(2)} m · {w.scenarioCriticalZones} peak critical zones
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded border border-line bg-panel-2 px-3 py-2">
            <span className="label">Flood delay</span>
            <span className="mono text-[18px] font-bold" style={{ color: delayColor }}>
              {zoneAlready && w.delayMinutes === 0 ? 'already critical' : delay}
            </span>
          </div>
          <div className="text-[10px] leading-snug text-dim">
            Both runs use the identical deterministic engine from the current state; only the drainage multiplier differs. Apply the scenario city-wide with the Drainage capacity control.
          </div>
        </>
      ) : (
        <div className="text-[11px] text-muted">No district is projected to reach critical within 5 h. Increase rainfall or pick a heavier scenario.</div>
      )}
    </div>
  )
}

/** Compact 3-figure strip for the command centre. */
export function WhatIfStrip({ sim }: { sim: Simulation }) {
  const w = sim.whatIf
  const fmt = (m: number) => (m === Infinity ? 'averted' : m === 0 ? 'now' : formatDuration(m))
  if (!w) {
    return (
      <div className="p-3 text-[11px] text-muted">No district projected critical within 5 h.</div>
    )
  }
  const delay = w.delayMinutes === Infinity ? 'AVERTED' : w.delayMinutes > 0 ? `+${formatDuration(w.delayMinutes)}` : w.baselineMinutes === 0 ? 'ALREADY CRITICAL' : '—'
  return (
    <div className="p-3">
      <div className="mono mb-2 text-[10px] text-muted">
        {w.zoneId} {w.zoneName.toUpperCase()} · {Math.round(w.baselineDrainage * 100)}% → {Math.round(w.scenarioDrainage * 100)}% drainage
      </div>
      <div className="grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line">
        <div className="bg-panel p-2">
          <div className="label text-[8px]">Without</div>
          <div className="mono mt-0.5 text-[13px] font-semibold text-critical">{fmt(w.baselineMinutes)}</div>
          <div className="mono text-[9px] text-muted">{w.baselineCriticalZones} crit zones</div>
        </div>
        <div className="bg-panel p-2">
          <div className="label text-[8px]">+{Math.round((w.scenarioDrainage - w.baselineDrainage) * 100)}% drain</div>
          <div className="mono mt-0.5 text-[13px] font-semibold text-safe">{fmt(w.scenarioMinutes)}</div>
          <div className="mono text-[9px] text-muted">{w.scenarioCriticalZones} crit zones</div>
        </div>
        <div className="bg-panel-2 p-2">
          <div className="label text-[8px]">Delay</div>
          <div className="mono mt-0.5 text-[13px] font-bold" style={{ color: w.delayMinutes > 0 ? '#3ddc97' : '#8b95a7' }}>
            {delay}
          </div>
        </div>
      </div>
      <input type="range" min={0.6} max={2} step={0.05} value={sim.whatIfDrainage} onChange={(e) => sim.setWhatIfDrainage(Number(e.target.value))} className="mt-2" />
      <div className="mt-1.5 text-[10.5px] leading-snug text-muted">
        {w.delayMinutes === Infinity
          ? `With ${Math.round(w.scenarioDrainage * 100)}% drainage, ${w.zoneName} would not reach critical in the next 5 h.`
          : w.delayMinutes > 0
            ? `Adding ${Math.round((w.scenarioDrainage - w.baselineDrainage) * 100)}% drainage buys ${w.zoneName} ${formatDuration(w.delayMinutes)} more time before it goes critical.`
            : w.baselineMinutes === 0
              ? `${w.zoneName} is already critical — drainage now limits how many other districts follow (${w.baselineCriticalZones} → ${w.scenarioCriticalZones}).`
              : 'Drag the slider to compare drainage levels.'}
      </div>
    </div>
  )
}

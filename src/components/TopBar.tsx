import { formatSimTime } from '../simulation/engine'
import type { Simulation } from '../hooks/useSimulation'
import { RISK_COLOR } from '../lib/format'
import type { RiskLevel } from '../simulation/types'

export type ViewMode = 'ops' | 'command'

export function systemStatus(sim: Simulation): { label: string; level: RiskLevel } {
  const snap = sim.state.history[sim.state.history.length - 1]
  if (snap.floodedCount > 0) return { label: 'FLOODING', level: 'FLOODED' }
  const crit = sim.state.zones.filter((z) => z.waterLevel / z.floodThreshold >= 0.75).length
  if (crit > 0) return { label: 'CRITICAL', level: 'CRITICAL' }
  if (snap.highRiskCount > 0) return { label: 'ELEVATED', level: 'WARNING' }
  if (sim.forecast.firstCritical && sim.forecast.firstCritical.minutes <= 120) return { label: 'WATCH', level: 'WATCH' }
  return { label: 'NOMINAL', level: 'SAFE' }
}

export function TopBar({ sim, mode, setMode, onHome }: { sim: Simulation; mode: ViewMode; setMode: (m: ViewMode) => void; onHome?: () => void }) {
  const status = systemStatus(sim)
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 overflow-hidden border-b border-line bg-panel px-4">
      <div className="flex min-w-0 items-center gap-4 overflow-hidden">
        <button className="flex shrink-0 items-center gap-2" onClick={onHome} title="Back to landing page">
          <svg width="22" height="22" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="6" fill="#0e2a35" />
            <path d="M6 20c3-4 6-4 10 0s7 4 10 0" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M6 13c3-4 6-4 10 0s7 4 10 0" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".5" />
          </svg>
          <span className="text-[15px] font-semibold tracking-[0.18em]">FLOWSHIELD</span>
          <span className="label ml-1 hidden whitespace-nowrap 2xl:inline">Flood Digital Twin · Early Warning</span>
        </button>
        <div className="mx-2 h-5 w-px bg-line-2" />
        <div className="flex items-center gap-2">
          <span className="label">System</span>
          <span className="mono flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold" style={{ color: RISK_COLOR[status.level] }}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.level !== 'SAFE' ? 'blink' : ''}`} style={{ background: RISK_COLOR[status.level] }} />
            {status.label}
          </span>
        </div>
        <div className="mx-2 h-5 w-px bg-line-2" />
        <div className="flex items-center gap-2">
          <span className="label">Sim time</span>
          <span className="mono text-[13px] font-semibold text-water">{formatSimTime(sim.state.minutes)}</span>
          {sim.playing && <span className="mono text-[10px] text-muted">{sim.speed}×</span>}
        </div>
        <div className="mx-2 h-5 w-px bg-line-2" />
        <div className="flex items-center gap-2">
          <span className="label">Scenario</span>
          <span className="mono whitespace-nowrap text-[11px]">{sim.profile.name}</span>
          <span className="label hidden whitespace-nowrap text-[9px] 2xl:inline">{sim.profile.source === 'open-meteo' ? '· LIVE FORECAST' : '· SYNTHETIC'}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex rounded border border-line-2 p-0.5">
          <button className={`btn h-6 border-0 ${mode === 'ops' ? 'bg-panel-2 text-water' : 'bg-transparent text-muted'}`} onClick={() => setMode('ops')}>
            Operations
          </button>
          <button className={`btn h-6 border-0 ${mode === 'command' ? 'bg-panel-2 text-water' : 'bg-transparent text-muted'}`} onClick={() => setMode('command')}>
            Command Center
          </button>
        </div>
        <button className="btn btn-primary" onClick={sim.runDemo} disabled={sim.demoRunning}>
          {sim.demoRunning ? '● Demo running' : '▶ Run Demo Scenario'}
        </button>
      </div>
    </header>
  )
}

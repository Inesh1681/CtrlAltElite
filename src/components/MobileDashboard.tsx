import { useState } from 'react'
import type { Simulation } from '../hooks/useSimulation'
import { RISK_COLOR } from '../lib/format'
import { formatSimTime } from '../simulation/engine'
import { AiPanel } from './AiPanel'
import { AlertsFeed } from './AlertsFeed'
import { CityMap, RiskLegend } from './CityMap'
import { ScenarioControls } from './Controls'
import { Kpis } from './Kpis'
import { Logo } from './Landing'
import { Timeline, TimelineLegend } from './Timeline'
import { systemStatus } from './TopBar'
import { WhatIfStrip } from './WhatIfPanel'
import { ZoneDetail } from './ZoneDetail'

type Tab = 'storm' | 'zone' | 'alerts' | 'analyst' | 'timeline'

/**
 * Phone / small-tablet layout: everything stacked, the map always visible,
 * a sticky play bar and a bottom tab bar for the detail panels.
 */
export function MobileDashboard({ sim, onHome }: { sim: Simulation; onHome: () => void }) {
  const [tab, setTab] = useState<Tab>('storm')
  const status = systemStatus(sim)

  // jump to the zone tab when a district is tapped
  const [lastSel, setLastSel] = useState<string | null>(null)
  if (sim.selectedZoneId !== lastSel) {
    setLastSel(sim.selectedZoneId)
    if (sim.selectedZoneId) setTab('zone')
  }

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'storm', label: 'Storm' },
    { id: 'zone', label: 'Zone' },
    { id: 'alerts', label: 'Alerts', badge: sim.alerts.length },
    { id: 'analyst', label: 'Analyst' },
    { id: 'timeline', label: 'Timeline' },
  ]

  return (
    <div className="flex h-full flex-col bg-bg text-text">
      {/* header */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-panel px-3">
        <button className="flex items-center gap-2" onClick={onHome}>
          <Logo />
          <span className="text-[13px] font-semibold tracking-[0.16em]">FLOWSHIELD</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="mono flex items-center gap-1 text-[10px] font-semibold" style={{ color: RISK_COLOR[status.level] }}>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${status.level !== 'SAFE' ? 'blink' : ''}`} style={{ background: RISK_COLOR[status.level] }} />
            {status.label}
          </span>
          <span className="mono text-[12px] font-semibold text-water">{formatSimTime(sim.state.minutes)}</span>
        </div>
      </header>

      {/* scrollable body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-2 p-2">
          <Kpis sim={sim} columns={2} />

          <section className="panel">
            <div className="panel-head py-1.5">
              <span className="label">{sim.profile.name}</span>
              <span className="mono text-[9px] text-muted">tap a district</span>
            </div>
            <div className="aspect-[4/3] p-1">
              <CityMap state={sim.state} selectedZoneId={sim.selectedZoneId} onSelect={sim.selectZone} compact showHint={!sim.playing && sim.state.tick === 0} />
            </div>
            <div className="overflow-x-auto border-t border-line px-2 py-1.5">
              <RiskLegend />
            </div>
          </section>

          {/* tab content */}
          <section className="panel min-h-[260px]">
            {tab === 'storm' && (
              <div className="p-3">
                <ScenarioControls sim={sim} />
              </div>
            )}
            {tab === 'zone' && (
              <div>
                <ZoneDetail sim={sim} />
                <div className="border-t border-line">
                  <div className="panel-head">
                    <span className="label">What if we add drainage?</span>
                  </div>
                  <WhatIfStrip sim={sim} />
                </div>
              </div>
            )}
            {tab === 'alerts' && <AlertsFeed alerts={sim.alerts} onSelect={sim.selectZone} />}
            {tab === 'analyst' && (
              <div className="h-[420px]">
                <AiPanel sim={sim} auto={sim.playing} />
              </div>
            )}
            {tab === 'timeline' && (
              <div>
                <div className="panel-head py-1.5">
                  <span className="label">Timeline</span>
                </div>
                <div className="h-[180px]">
                  <Timeline history={sim.state.history} zonesTotal={sim.state.zones.length} />
                </div>
                <div className="overflow-x-auto px-3 py-2">
                  <TimelineLegend />
                </div>
              </div>
            )}
          </section>
          <div className="h-2" />
        </div>
      </div>

      {/* sticky play bar + tabs */}
      <div className="shrink-0 border-t border-line bg-panel">
        <div className="flex items-center gap-1.5 px-2 py-2">
          <button className={`btn h-9 flex-1 justify-center text-[12px] ${sim.playing ? '' : 'btn-primary'}`} onClick={sim.toggle} disabled={sim.finished}>
            {sim.playing ? '❚❚ Pause' : sim.finished ? 'Storm over' : '▶ Play'}
          </button>
          <button className="btn h-9" onClick={sim.stepOnce} disabled={sim.finished}>
            ⏭
          </button>
          <button className="btn h-9" onClick={sim.reset}>
            ↺
          </button>
          <button className="btn h-9" onClick={() => sim.setSpeed(sim.speed === 4 ? 0.5 : sim.speed === 0.5 ? 1 : sim.speed === 1 ? 2 : 4)} title="Speed">
            {sim.speed}×
          </button>
          <button className="btn btn-primary h-9" onClick={sim.runDemo} disabled={sim.demoRunning}>
            Demo
          </button>
        </div>
        <div className="flex border-t border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`flex-1 py-2 text-[10px] font-medium uppercase tracking-[0.08em] ${tab === t.id ? 'text-water' : 'text-muted'}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
              {t.badge ? <span className="mono ml-1 rounded bg-panel-2 px-1 text-[9px] text-warning">{t.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

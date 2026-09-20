import { useState } from 'react'
import type { Simulation } from '../hooks/useSimulation'
import { AiPanel } from './AiPanel'
import { AlertsFeed } from './AlertsFeed'
import { CityMap, RiskLegend } from './CityMap'
import { ScenarioControls, TransportControls } from './Controls'
import { Kpis } from './Kpis'
import { Timeline, TimelineLegend, TimeScrubber } from './Timeline'
import { WhatIfStrip } from './WhatIfPanel'
import { ZoneDetail } from './ZoneDetail'

type RightTab = 'zone' | 'alerts' | 'ai'

export function Operations({ sim }: { sim: Simulation }) {
  const [tab, setTab] = useState<RightTab>('zone')
  const [autoTab, setAutoTab] = useState(true)

  // when the user (or demo) selects a zone, jump to the zone tab
  const selected = sim.selectedZoneId
  const [lastSel, setLastSel] = useState<string | null>(null)
  if (selected !== lastSel) {
    setLastSel(selected)
    if (selected && autoTab) setTab('zone')
  }

  const tabs: Array<{ id: RightTab; label: string; badge?: number }> = [
    { id: 'zone', label: 'Selected zone' },
    { id: 'alerts', label: 'Alerts', badge: sim.alerts.length },
    { id: 'ai', label: 'Analyst' },
  ]

  return (
    <div className="grid h-full min-h-0 grid-cols-[280px_minmax(0,1fr)_340px] gap-2 p-2">
      {/* left: the storm */}
      <div className="flex min-h-0 flex-col gap-2">
        <section className="panel p-3">
          <StepLabel n={1} text="Run the storm" />
          <TransportControls sim={sim} />
        </section>
        <section className="panel min-h-0 flex-1 overflow-y-auto p-3">
          <StepLabel n={2} text="Choose the storm & drainage" />
          <ScenarioControls sim={sim} />
        </section>
      </div>

      {/* centre: map + timeline */}
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <Kpis sim={sim} />
        <section className="panel flex min-h-0 flex-1 flex-col">
          <div className="panel-head">
            <StepLabel n={3} text="Watch water flow through the city — click a district" inline />
            <RiskLegend />
          </div>
          <div className="min-h-0 flex-1 p-1">
            <CityMap state={sim.state} blocked={sim.params.blockedZones} selectedZoneId={sim.selectedZoneId} onSelect={sim.selectZone} showHint={!sim.playing && sim.state.tick === 0} />
          </div>
        </section>
        <section className="panel flex h-[18vh] max-h-[170px] min-h-[110px] shrink-0 flex-col">
          <div className="panel-head py-1.5">
            <div className="flex items-center gap-4">
              <span className="label">Timeline</span>
              <TimeScrubber tick={sim.state.tick} maxTick={sim.maxTick} onScrub={sim.scrubTo} />
            </div>
            <TimelineLegend />
          </div>
          <div className="min-h-0 flex-1">
            <Timeline history={sim.state.history} zonesTotal={sim.state.zones.length} />
          </div>
        </section>
      </div>

      {/* right: zone / alerts / analyst */}
      <section className="panel flex min-h-0 flex-col">
        <div className="flex border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`flex-1 border-b-2 px-2 py-2.5 text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${tab === t.id ? 'border-water text-water' : 'border-transparent text-muted hover:text-text'}`}
              onClick={() => {
                setTab(t.id)
                setAutoTab(t.id === 'zone')
              }}
            >
              {t.label}
              {t.badge ? <span className="mono ml-1 rounded bg-panel-2 px-1 text-[10px] text-warning">{t.badge}</span> : null}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === 'zone' && (
            <div className="flex h-full flex-col overflow-y-auto">
              <ZoneDetail sim={sim} />
              <div className="mt-auto border-t border-line">
                <div className="panel-head">
                  <StepLabel n={4} text="What if we add drainage?" inline />
                </div>
                <WhatIfStrip sim={sim} />
              </div>
            </div>
          )}
          {tab === 'alerts' && (
            <div className="h-full overflow-y-auto">
              <AlertsFeed alerts={sim.alerts} onSelect={sim.selectZone} />
            </div>
          )}
          {tab === 'ai' && <AiPanel sim={sim} auto={sim.playing} />}
        </div>
      </section>
    </div>
  )
}

export function StepLabel({ n, text, inline }: { n: number; text: string; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${inline ? '' : 'mb-2'}`}>
      <span className="mono flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0e2a35] text-[10px] font-semibold text-water">{n}</span>
      <span className="text-[11px] font-medium text-text">{text}</span>
    </div>
  )
}

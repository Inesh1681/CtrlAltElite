import { useEffect, useState } from 'react'
import { CAN, useAuth } from '../auth/auth'
import { SPEEDS, type Simulation, type Speed } from '../hooks/useSimulation'
import { SCENARIOS } from '../simulation/scenarios'
import { fetchPrecipitationForecast, WEATHER_LOCATIONS, type WeatherResult } from '../weather/openMeteo'

export function TransportControls({ sim }: { sim: Simulation }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button className={`btn h-9 px-4 text-[12px] ${sim.playing ? '' : 'btn-primary'}`} onClick={sim.toggle} disabled={sim.finished}>
        {sim.playing ? '❚❚ Pause' : sim.finished ? 'Storm over' : '▶ Play'}
      </button>
      <button className="btn" onClick={sim.stepOnce} disabled={sim.finished} title="Step one tick (5 min)">
        ⏭ Step
      </button>
      <button className="btn" onClick={sim.reset}>
        ↺ Reset
      </button>
      <div className="flex items-center gap-2">
        <span className="label text-[9px]">Speed</span>
        <div className="flex rounded border border-line-2 p-0.5">
          {SPEEDS.map((s) => (
            <button key={s} className={`btn h-6 border-0 px-2 ${sim.speed === s ? 'bg-panel-2 text-water' : 'bg-transparent text-muted'}`} onClick={() => sim.setSpeed(s as Speed)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
      {sim.finished && <div className="w-full text-[10px] text-muted">Simulation reached T+06:00. Press Reset to run again.</div>}
    </div>
  )
}

export function ScenarioControls({ sim }: { sim: Simulation }) {
  const [custom, setCustom] = useState(60)
  const [advanced, setAdvanced] = useState(false)
  const { role } = useAuth()
  const canEdit = CAN.changeScenario(role)
  const [weatherLoc, setWeatherLoc] = useState(0)
  const [weather, setWeather] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; result?: WeatherResult; error?: string }>({ status: 'idle' })

  useEffect(() => {
    if (sim.scenario.kind === 'custom') sim.setScenario({ kind: 'custom', mmPerHour: custom })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom])

  async function loadWeather() {
    setWeather({ status: 'loading' })
    try {
      const result = await fetchPrecipitationForecast(WEATHER_LOCATIONS[weatherLoc])
      setWeather({ status: 'ok', result })
      sim.setScenario({ kind: 'weather', profile: result.profile })
    } catch (e) {
      setWeather({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  }

  const active = sim.scenario

  return (
    <fieldset disabled={!canEdit} className={`space-y-3 ${canEdit ? '' : 'opacity-70'}`}>
      {!canEdit && <div className="rounded border border-line bg-panel-2 px-2 py-1.5 text-[10px] text-muted">Observer role — controls are read-only. Sign in as operator or commander to change the storm.</div>}
      <div>
        <div className="label mb-1.5">Storm scenario</div>
        <div className="grid grid-cols-2 gap-1">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              className={`btn justify-center ${active.kind === 'preset' && active.id === s.id ? 'btn-active' : ''}`}
              onClick={() => sim.setScenario({ kind: 'preset', id: s.id })}
              title={s.description}
            >
              {s.name.replace(' RAIN', '').replace('HEAVY ', '').replace(' STORM', '').replace('UPSTREAM ', '↘ ')}
            </button>
          ))}
        </div>
        <div className="mt-1 text-[10px] leading-snug text-muted">{sim.profile.description}</div>
      </div>

      <Slider
        label="Rainfall"
        value={sim.params.rainfallMultiplier}
        min={0.5}
        max={2}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={sim.setRainfallMultiplier}
        hint="more rain → faster flooding"
      />
      <Slider
        label="Drainage capacity"
        value={sim.params.drainageMultiplier}
        min={0.4}
        max={2}
        step={0.05}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={sim.setDrainageMultiplier}
        hint="more drains → slower flooding"
        accent={sim.params.drainageMultiplier > 1 ? '#3ddc97' : sim.params.drainageMultiplier < 1 ? '#f2913d' : undefined}
      />

      <button className="flex w-full items-center justify-between border-t border-line pt-3 text-left" onClick={() => setAdvanced((a) => !a)}>
        <span className="label">Advanced</span>
        <span className="mono text-[10px] text-muted">{advanced ? 'hide ▴' : 'custom rain · live weather ▾'}</span>
      </button>
      {advanced && (
      <>
      <div>
        <div className="flex items-center justify-between">
          <span className="label">Custom rainfall</span>
          <button className={`btn h-6 ${active.kind === 'custom' ? 'btn-active' : ''}`} onClick={() => sim.setScenario({ kind: 'custom', mmPerHour: custom })}>
            {active.kind === 'custom' ? 'Active' : 'Use'}
          </button>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <input type="range" min={0} max={200} step={5} value={custom} onChange={(e) => setCustom(Number(e.target.value))} />
          <span className="mono w-16 text-right text-[11px]">{custom} mm/h</span>
        </div>
      </div>

      <div className="border-t border-line pt-3">
        <div className="flex items-center justify-between">
          <span className="label">Real weather · Open-Meteo</span>
          <span className="label text-[9px] text-dim">optional</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <select value={weatherLoc} onChange={(e) => setWeatherLoc(Number(e.target.value))} className="flex-1">
            {WEATHER_LOCATIONS.map((l, i) => (
              <option key={l.name} value={i}>
                {l.name}
              </option>
            ))}
          </select>
          <button className={`btn ${active.kind === 'weather' ? 'btn-active' : ''}`} onClick={loadWeather} disabled={weather.status === 'loading'}>
            {weather.status === 'loading' ? 'Fetching…' : 'Load forecast'}
          </button>
        </div>
        {weather.status === 'ok' && weather.result && (
          <div className="mono mt-1.5 text-[10px] text-muted">
            next 12h · peak {weather.result.peak.toFixed(1)} mm/h · total {weather.result.total.toFixed(1)} mm
            {weather.result.peak < 5 && <span className="ml-1 text-dim">(light — raise rainfall % to stress-test)</span>}
          </div>
        )}
        {weather.status === 'error' && <div className="mt-1.5 text-[10px] text-critical">Forecast unavailable ({weather.error}). Synthetic mode remains active.</div>}
      </div>
      </>
      )}
    </fieldset>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  hint,
  accent,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  hint?: string
  accent?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="mono text-[12px] font-semibold" style={{ color: accent }}>
          {format(value)}
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5" />
      {hint && <div className="mt-0.5 text-[10px] text-dim">{hint}</div>}
    </div>
  )
}

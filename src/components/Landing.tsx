import { useEffect, useState } from 'react'
import { generateCity } from '../simulation/city'
import { createInitialState, DEFAULT_PARAMS, formatSimTime, step } from '../simulation/engine'
import { HEAVY_MONSOON } from '../simulation/scenarios'
import type { SimState } from '../simulation/types'
import { CityMap } from './CityMap'

const CITY = generateCity()
const LOOP_MINUTES = 5 * 60

/** Self-running monsoon preview for the hero — same engine, no controls. */
function useHeroSimulation(): SimState {
  const [state, setState] = useState<SimState>(() => createInitialState(CITY))
  useEffect(() => {
    const id = window.setInterval(() => {
      setState((s) => (s.minutes >= LOOP_MINUTES ? createInitialState(CITY) : step(s, DEFAULT_PARAMS, HEAVY_MONSOON)))
    }, 350)
    return () => window.clearInterval(id)
  }, [])
  return state
}

export function Landing({ onOpen, onDemo }: { onOpen: () => void; onDemo: () => void }) {
  const hero = useHeroSimulation()
  const snap = hero.history[hero.history.length - 1]

  return (
    <div className="h-full overflow-y-auto bg-bg text-text">
      {/* nav */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-[15px] font-semibold tracking-[0.18em]">FLOWSHIELD</span>
          <span className="label ml-2 hidden sm:inline">Flood digital twin</span>
        </div>
        <nav className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <a href="#how" className="btn border-0 bg-transparent text-muted">
              How it works
            </a>
            <a href="https://github.com/Inesh1681/CtrlAltElite" target="_blank" rel="noreferrer" className="btn border-0 bg-transparent text-muted">
              GitHub
            </a>
          </div>
          <button className="btn btn-primary" onClick={onOpen}>
            Open dashboard →
          </button>
        </nav>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-5 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <div className="label mb-4 flex items-center gap-2 text-water">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-water" />
            Flood simulation · early warning · decision support
          </div>
          <h1 className="text-[34px] font-semibold leading-[1.08] tracking-tight sm:text-[52px]">
            See the flood
            <br />
            <span className="text-water">before it arrives.</span>
          </h1>
          <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-muted">
            FLOWSHIELD is a digital twin of a city under a storm. It simulates how rain accumulates, drains and flows downhill through
            connected districts, predicts <em className="not-italic text-text">which</em> districts go critical and{' '}
            <em className="not-italic text-text">when</em>, raises warnings early — and shows exactly how much time a drainage
            intervention buys.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button className="btn btn-primary h-10 px-5 text-[12px]" onClick={onDemo}>
              ▶ Run the 60-second demo
            </button>
            <button className="btn h-10 px-5 text-[12px]" onClick={onOpen}>
              Explore the dashboard
            </button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-dim">
            <span>Deterministic engine · 17 tests</span>
            <span>48 districts · 5-minute timesteps</span>
            <span>No backend · runs in the browser</span>
          </div>
        </div>

        <div className="panel relative overflow-hidden" style={{ boxShadow: '0 30px 80px -30px rgba(34,211,238,0.25)' }}>
          <div className="panel-head">
            <span className="label">Live preview · Heavy monsoon</span>
            <span className="mono text-[11px] text-water">{formatSimTime(hero.minutes)}</span>
          </div>
          <div className="aspect-[4/3] p-1">
            <CityMap state={hero} selectedZoneId={null} onSelect={() => undefined} compact />
          </div>
          <div className="mono flex items-center justify-between border-t border-line px-3 py-2 text-[10px] text-muted">
            <span>
              rain <span className="text-text">{Math.round(snap.rainfall)} mm/h</span>
            </span>
            <span>
              at risk <span className="text-warning">{snap.highRiskCount}</span> · flooded <span className="text-flooded">{snap.floodedCount}</span>
            </span>
            <span>drains {Math.round(snap.avgDrainageUtil * 100)}%</span>
          </div>
        </div>
      </section>

      {/* narrative strip */}
      <section className="border-y border-line bg-panel">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-6 py-5">
          {['RAIN', 'ACCUMULATION', 'FLOW THROUGH CITY', 'RISK PREDICTION', 'EARLY WARNING', 'INTERVENTION', 'FLOOD DELAY'].map((s, i, arr) => (
            <span key={s} className="flex items-center gap-3">
              <span className={`mono text-[11px] tracking-[0.14em] ${i === arr.length - 1 ? 'text-safe' : i >= 3 ? 'text-water' : 'text-muted'}`}>{s}</span>
              {i < arr.length - 1 && <span className="text-dim">→</span>}
            </span>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-[1200px] px-6 py-16">
        <h2 className="text-[24px] font-semibold tracking-tight">Not a dashboard. A decision tool.</h2>
        <p className="mt-2 max-w-[640px] text-[13px] text-muted">Every number on screen comes from the simulation engine — the map, the alerts, the what-if and the analyst all read the same state.</p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Feature
            icon="🌧"
            title="Physically-inspired engine"
            text="Each 5-minute tick: water += rain × catchment + upstream inflow − drainage − downhill outflow. Flow follows the water-surface gradient across connected districts."
          />
          <Feature
            icon="◼"
            title="Risk states you can read at a glance"
            text="SAFE → WATCH → WARNING → CRITICAL → FLOODED, scored from standing water, rainfall, drain load, elevation and upstream inflow — with the contributing factors shown for every district."
          />
          <Feature
            icon="⏱"
            title="Time-to-critical, not just colour"
            text="The engine runs 5 hours ahead at every step and tells you when each district crosses the line. Alerts fire with a timestamp and a reason."
          />
          <Feature
            icon="⇄"
            title="What-if intervention"
            text="Change drainage capacity and compare: without intervention critical in 1h 55m — with +40% drainage, averted. Both runs use the identical engine."
            accent
          />
          <Feature
            icon="🇮🇳"
            title="Built for Indian monsoons"
            text="Presets annotated with IMD rainfall bands (Mumbai 2005, Chennai 2015), live Open-Meteo forecasts for Indian cities, and an UPSTREAM SURGE scenario modelled on the 2026 Nepal → Gandak floods."
          />
          <Feature
            icon="✦"
            title="Analyst that can't make things up"
            text="A Claude-powered analyst explains why a district is at risk and what to do — reading only the engine's structured state, with a deterministic fallback so the demo never breaks."
          />
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="border-t border-line bg-panel">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-6 py-16 lg:grid-cols-2">
          <div>
            <h2 className="text-[24px] font-semibold tracking-tight">How it works</h2>
            <ol className="mt-6 space-y-4">
              <Step n={1} title="A synthetic city with real terrain logic">
                48 districts on a grid: hills to the north-west, a river valley bending into a harbour basin. Elevation is pit-filled the way real DEMs are, so every district has a downhill path.
              </Step>
              <Step n={2} title="A storm hits">
                Pick Normal rain, Heavy monsoon, Extreme storm or an Upstream surge — or pull a live 12-hour forecast for Mumbai, Chennai, Patna and more.
              </Step>
              <Step n={3} title="Water moves, risk is scored">
                Rain lands, drains remove what they can, the rest flows to lower neighbours. Each district gets a risk state and a projected time-to-critical.
              </Step>
              <Step n={4} title="You intervene">
                Drag the drainage slider. FLOWSHIELD reruns the future and reports the delay you bought — and how many districts you kept out of the red.
              </Step>
            </ol>
          </div>
          <div className="panel self-start p-5">
            <div className="label mb-3">Per district, every 5 simulated minutes</div>
            <pre className="mono overflow-x-auto text-[12px] leading-relaxed text-text">
              {`rainInput  = rainfall × catchment
inflow     = Σ water from higher neighbours
outflow    = Σ water to lower neighbours   (≤ 40 % / tick)
drained    = min(available, capacity × drainageMultiplier)

water'     = water + rainInput + inflow
                   − outflow − drained`}
            </pre>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] text-muted">
              <div>
                <div className="label text-[9px]">Risk score</div>
                0.45 water · 0.15 rain · 0.15 drain load · 0.10 elevation · 0.15 inflow
              </div>
              <div>
                <div className="label text-[9px]">Deterministic</div>
                No randomness anywhere. Same inputs, same flood, every time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1200px] px-6 py-16 text-center">
        <h2 className="text-[28px] font-semibold tracking-tight">Watch the valley go under — then stop it.</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-[13px] text-muted">The demo resets the city, loads a heavy monsoon, and runs three simulated hours in about 45 seconds.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="btn btn-primary h-10 px-5 text-[12px]" onClick={onDemo}>
            ▶ Run the demo
          </button>
          <button className="btn h-10 px-5 text-[12px]" onClick={onOpen}>
            Open dashboard
          </button>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-6">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 text-[11px] text-dim">
          <span>FLOWSHIELD · Team CtrlAltElite · Hackathon problem statement 2</span>
          <span>Synthetic city & terrain · live rainfall via Open-Meteo · surge hydrograph illustrative</span>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, text, accent }: { icon: string; title: string; text: string; accent?: boolean }) {
  return (
    <div className="panel p-4" style={accent ? { borderColor: '#22d3ee55' } : undefined}>
      <div className="text-[18px]">{icon}</div>
      <div className="mt-2 text-[13px] font-semibold">{title}</div>
      <div className="mt-1.5 text-[12px] leading-relaxed text-muted">{text}</div>
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mono mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0e2a35] text-[11px] font-semibold text-water">{n}</span>
      <div>
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="mt-1 text-[12px] leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  )
}

export function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="6" fill="#0e2a35" />
      <path d="M6 20c3-4 6-4 10 0s7 4 10 0" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M6 13c3-4 6-4 10 0s7 4 10 0" stroke="#22d3ee" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".5" />
    </svg>
  )
}

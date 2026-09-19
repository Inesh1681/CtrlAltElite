# FLOWSHIELD — Flood Digital Twin & Early Warning

Team **CtrlAltElite** · Hackathon Problem Statement 2

FLOWSHIELD is a deterministic flood simulation and decision-support dashboard. A synthetic
48-district Indian river city with realistic terrain receives a storm; water accumulates, drains, and
flows downhill through connected districts. The system scores every district's risk,
projects *when* it will go critical, raises early warnings, and quantifies how much a
drainage intervention delays flooding.

> RAIN → WATER ACCUMULATION → FLOW THROUGH CITY → RISK PREDICTION → EARLY WARNING → INTERVENTION → FLOOD DELAY

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # simulation engine tests (vitest)
npm run build      # production build → dist/
```

Optional: copy `.env.example` to `.env` and set `VITE_ANTHROPIC_API_KEY` to have the Analyst
panel use Claude. Without it the deterministic rule-based explainer is used — the demo never
depends on network access.

## Demo (60 seconds)

1. Press **▶ Run Demo Scenario** (or key `D`). Switch to **Command Center** (key `C`).
2. T+00:30 — low-lying districts along the river enter **WATCH**; alerts list projected
   time-to-critical.
3. T+01:30 — water propagates down the valley; **WARNING / CRITICAL** appear, the
   *What-if* strip shows e.g. "Central Station critical in 1h 55m → averted with +40% drainage".
4. T+02:00 — Lower Marsh / Meadowbank / Harbour Basin **FLOOD**; interventions update.
5. Drag the what-if slider or the city-wide **Drainage capacity** slider to show the delay.
6. Pick **↘ SURGE** to show a different flood mechanism: light rain, but a flood wave enters
   through the river inlet and marches down the corridor while the hills stay SAFE.

## Indian context

- Storm presets are annotated with IMD rainfall categories (heavy / very heavy / extremely heavy,
  cloudburst) and reference events (Mumbai 26 Jul 2005, Chennai Dec 2015).
- Live weather (Open-Meteo) offers Indian cities incl. Patna and Bettiah (West Champaran) on the
  Gandak/Kosi system, plus Kathmandu as the upstream reference.
- **UPSTREAM SURGE** scenario — inspired by the Aug–Sep 2026 Nepal floods: a glacier collapse on
  Langtang Lirung sent a debris flow down the Trishuli/Bhote Koshi into the Gandak; Bihar projected
  Gandak Barrage inflows rising from ~80,000 to ~250,000 cusecs and evacuated riverine West Champaran.
  In FLOWSHIELD the wave enters at the two **river inlet** cells on the west edge as an external
  inflow (a hydrograph in mm/h-equivalent), so the river corridor floods from upstream even though
  local rain is light and drains are not overloaded. The hydrograph is illustrative, not measured.
  Sources: [Wikipedia – 2026 Nepal floods](https://en.wikipedia.org/wiki/2026_Nepal_floods),
  [Vajiram – Nepal Floods 2026](https://vajiramandravi.com/current-affairs/nepal-flood/),
  [Nepal MoFA update, 6 Sep 2026](https://mofa.gov.np/content/1878/daily-update-6-september-2026/).

Keys: `Space` play/pause · `N` step · `R` reset · `D` demo · `C` command center · `O` operations.

## Architecture

```
src/
  simulation/          ← pure, deterministic, no React
    types.ts           zone / params / state types
    city.ts            synthetic 8×6 city: terrain (valley + harbour basin), pit-filling, land use
    flow.ts            inter-zone surface flow along the water-surface gradient
    engine.ts          step(): water += rain·catchment + inflow − drainage − outflow − sea discharge
    risk.ts            composite risk score, SAFE→FLOODED levels, contributing factors
    forecast.ts        forward projection: time-to-critical / time-to-flood per zone
    whatif.ts          baseline vs scenario-drainage comparison (same engine, one param changed)
    alerts.ts          level-escalation alerts with reason + projection
    scenarios.ts       NORMAL RAIN / HEAVY MONSOON / EXTREME STORM / UPSTREAM SURGE / custom / live forecast
    engine.test.ts     17 vitest cases (determinism, conservation, downhill flow, thresholds, surge…)
  hooks/useSimulation.ts   play loop, params, alerts, forecast, what-if target selection, demo
  components/          CityMap (SVG twin), Timeline (Recharts), ZoneDetail, WhatIfPanel,
                       AlertsFeed, AiPanel, CommandCenter, Operations, TopBar, Controls, Kpis
  ai/explain.ts        structured-state → Claude (official SDK) with deterministic fallback
  weather/openMeteo.ts hourly precipitation forecast → rainfall profile
scripts/               calibration helpers (`npx tsx scripts/calibrate.ts`)
```

Stack: Vite · React 19 · TypeScript · Tailwind v4 · Recharts · Vitest · `@anthropic-ai/sdk`.

## Model (simplified, physically inspired)

Per 5-minute tick, for each district:

```
rainInput   = rainfall(mm/h) × zoneRainFactor × catchmentFactor   (mm/h → m/tick)
flows       = head-difference driven, head = elevation + waterDepth, ≤ 40 % of depth leaves per tick
drained     = min(available, drainageCapacity × drainageMultiplier)
seaOutflow  = 60 % of remaining depth for harbour outlet cells
surge       = external river inflow added at the inlet cells (UPSTREAM SURGE scenario only)
water'      = water + rainInput + inflow + surge − outflow − drained − seaOutflow
```

Terrain is **synthetic** (labelled on the map): a river valley bending to a south-east harbour,
north-west hills, deterministic roughness, then hydrological pit-filling so every district has a
downhill path. Everything is generated from closed-form functions and a hash — identical on every
load; no randomness anywhere in the simulation.

Risk = 0.45·water/threshold + 0.15·rain + 0.15·drainage load + 0.10·low elevation + 0.15·upstream
inflow, with hard overrides at 25 / 50 / 75 / 100 % of the flood threshold.

## Known limitations

- Synthetic city and terrain (Indian-style district names, not a real city); no real DEM or GIS layers. Open-Meteo provides real rainfall only; the surge hydrograph is illustrative.
- Simplified routing (no Manning/St-Venant), 4-neighbour connectivity, single water column per zone.
- "Drainage capacity" is a single city-wide multiplier in the what-if; no per-district interventions.
- Claude calls are made directly from the browser (hackathon convenience); production would proxy.

# FLOWSHIELD — Flood Digital Twin & Early Warning

Team **CtrlAltElite** · Hackathon Problem Statement 2

FLOWSHIELD is a deterministic flood simulation and decision-support dashboard. A synthetic
48-district Indian river city with realistic terrain receives a storm; water accumulates, drains, and
flows downhill through connected districts. The system scores every district's risk,
projects *when* it will go critical, raises early warnings, and quantifies how much a
drainage intervention delays flooding.

> RAIN → WATER ACCUMULATION → FLOW THROUGH CITY → RISK PREDICTION → EARLY WARNING → INTERVENTION → FLOOD DELAY

**Live app:** https://flowshield-jade.vercel.app · **Repo:** https://github.com/Inesh1681/CtrlAltElite · **Demo video:** `FLOWSHIELD-demo.mp4` (submitted with the form)

## AI component (what it is, and what it is not)

FLOWSHIELD has one AI component: the **Analyst** panel. It has two interchangeable back-ends that
read the *same* structured simulation state and produce the *same* four sections; the panel badge
always shows which one answered.

- **LLM back-end — Anthropic Claude (`claude-opus-5`)** via the official `@anthropic-ai/sdk`, called
  from the Vercel serverless function [`api/explain.ts`](api/explain.ts). The API key lives only on
  the server (`ANTHROPIC_API_KEY`); it is never shipped to the browser. Enabled by setting that one
  variable. **The public demo at flowshield-jade.vercel.app runs without an API key** (no paid
  account was used for the hackathon), so it answers with the rule engine below; the Claude path is
  fully implemented and tested locally with a key.
- **Rule-engine back-end (what the public demo uses)** — a deterministic explainer in
  [`src/ai/explain.ts`](src/ai/explain.ts) → `fallbackExplanation()` that turns the risk factors,
  time-to-critical forecast and what-if comparison into plain-English situation / why / interventions
  / monitor sections. It is generated from the engine's numbers at run time — nothing is hard-coded.
- **Input:** a structured JSON snapshot of the *current simulation state* (per-district water level,
  risk level and score, drainage load, upstream inflow, time-to-critical, population at risk, the
  what-if comparison). Built in [`src/ai/explain.ts`](src/ai/explain.ts) → `buildStructuredState()`.
- **Task:** explain *why* the focus district is at risk, which factors dominate, what intervention
  helps (quoting the what-if delay), and which districts to monitor next. The system prompt forbids
  inventing numbers — every figure it quotes comes from the engine.
- **The simulation engine is not AI.** Water balance, flow, risk scoring and forecasting are
  deterministic numerical code in `src/simulation/` (unit-tested). The AI interprets that state; it
  does not produce it.
- **Which one is live:** the panel badge reads **CLAUDE OPUS 5** when the LLM answered and
  **RULE ENGINE** otherwise (no key, network failure, or rate limit). Nothing is faked: the badge is
  set from the actual response source.
- **Cost guards:** identical snapshots are served from a cache, 40 calls / IP / hour, 900-token cap.

Other AI use: the team used an AI coding assistant (Claude Code) during the hackathon for writing
code, as permitted by the rules; the model, simulation design, calibration and integration decisions
are the team's own.

## Requirements coverage

| Brochure requirement | Where |
|---|---|
| Configure rainfall intensity | Rainfall slider, custom mm/h, presets, live Open-Meteo |
| City as a connected grid of regions | 48-district grid, 4-neighbour connectivity (`src/simulation/city.ts`) |
| Water accumulation and movement between regions | Water balance + gradient flow (`engine.ts`, `flow.ts`) |
| Drainage capacity and terrain / elevation | Per-district capacity, pit-filled elevation, sea outlet |
| Water levels over time | 5-minute timesteps, timeline chart, per-district depth |
| Classify Safe / Warning / Critical | SAFE · WATCH · WARNING · CRITICAL · FLOODED (`risk.ts`) |
| Time-based flood progression visualisation | Animated map (water gauge, flow arrows), timeline |
| Identify regions reaching critical | High-risk list, map frames, alerts |
| Estimated time to critical | 5-hour forward projection per district (`forecast.ts`), shown in KPI, zone panel, alerts |
| **Bonus** normal + heavy rainfall | NORMAL RAIN, HEAVY MONSOON, EXTREME STORM presets |
| **Bonus** drainage failure | City-wide drainage slider (down to 40 %) |
| **Bonus** blocked drainage channel | Per-district **⊘ Block drain** toggle in the zone panel (capacity → 0, marked on the map) |
| **Bonus** compare scenarios | What-if: baseline vs scenario drainage, delay in minutes, peak critical zones |
| **Bonus** estimated affected population | **People at risk** KPI (residents in WARNING+ / FLOODED districts), per-district residents |
| **Bonus** interactive time slider | **Time** scrubber under the timeline — rewinds the real state; play resumes from there |
| Extra | Upstream surge (Nepal → Gandak) scenario, live weather, AI analyst, roles + Google sign-in, mobile layout |

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # simulation engine tests (vitest)
npm run build      # production build → dist/
```

Optional: copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY` (server-side only) to have the
Analyst panel use Claude through the serverless function `api/explain.ts` — the key never reaches
the browser. Locally the same function runs inside `npm run dev`. Without it the deterministic
rule-based explainer is used — the demo never depends on network access.

## Sign-in

The dashboard is behind an operator sign-in (the landing page is public). Enter any name and
email, the access code (**`flowshield`** by default — set `VITE_ACCESS_CODE` to change it, and
`VITE_SHOW_DEMO_HINT=false` to hide the hint on the login page), and pick a role:

| Role | Can do |
|---|---|
| **Commander** | everything — scenarios, drainage interventions, demo, Command Center |
| **Operator** | run simulations and interventions |
| **Viewer** | read-only: watch the simulation, alerts and analyst; controls disabled |

Access-code sessions last 12 h in `localStorage`. This is a shared-code gate suitable for a demo —
there is no backend.

### Google sign-in (Firebase) — optional, ~5 minutes

1. Go to https://console.firebase.google.com → **Add project** (Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick a support email) → Save.
3. **Project settings (gear) → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig`.
4. Put the four values in `.env` (locally) and in Vercel → Project → Settings → Environment Variables:
   ```
   VITE_FIREBASE_API_KEY=…
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_APP_ID=…
   ```
5. **Authentication → Settings → Authorized domains** → add your Vercel domain (e.g. `ctrlaltelite.vercel.app`). `localhost` is pre-authorised.
6. Optional roles for Google accounts: `VITE_COMMANDER_EMAILS=a@x.com,b@y.com` / `VITE_VIEWER_EMAILS=…`. Everyone else is an operator.

When the four keys are present the login page shows **Continue with Google**; the access code stays
available as a fallback (“Use an access code instead”). Google sessions persist via Firebase and
show the account photo in the header. Firebase web config values are not secrets (they identify
the project; access is governed by the authorized-domain list and Firebase rules).

## Demo (60 seconds)

The app opens on a landing page (`/`) with a live monsoon preview. **Run the 60-second demo** jumps
into the dashboard with the demo already running (`#demo`); **Open dashboard** goes to `#app`;
`#command` opens the Command Center directly.

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

On screens narrower than 900 px the dashboard switches to a stacked **mobile layout** (map + KPIs,
sticky play bar, bottom tabs for Storm / Zone / Alerts / Analyst / Timeline). The Command Center is
desktop-only.

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
  auth/                access-code + Firebase Google sign-in behind one context; roles
  ai/explain.ts        structured-state → POST /api/explain, with deterministic fallback
api/explain.ts         Vercel function: holds ANTHROPIC_API_KEY, cache + rate limit, calls Claude
  weather/openMeteo.ts hourly precipitation forecast → rainfall profile
scripts/               calibration helpers (`npx tsx scripts/calibrate.ts`)
```

Stack: Vite · React 19 · TypeScript · Tailwind v4 · Recharts · Vitest · `@anthropic-ai/sdk` · `firebase` (auth only).

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

## Disclosures (libraries, templates, data)

- Scaffolded with the standard `npm create vite@latest` React + TypeScript template during the
  hackathon; all application code was written during the event.
- Open-source libraries: React, Vite, Tailwind CSS v4, Recharts, Vitest, Firebase JS SDK (auth
  only), `@anthropic-ai/sdk` (server-side only). No pre-built flood or simulation code was used.
- Data: the city, terrain and population figures are **synthetic** and labelled as such in the UI.
  Rainfall presets are annotated with IMD categories and reference events; live rainfall comes from
  Open-Meteo; the Nepal surge hydrograph is illustrative (sources linked above).

## Known limitations

- Synthetic city and terrain (Indian-style district names, not a real city); no real DEM or GIS layers. Open-Meteo provides real rainfall only; the surge hydrograph is illustrative.
- Simplified routing (no Manning/St-Venant), 4-neighbour connectivity, single water column per zone.
- The what-if compares city-wide drainage multipliers; the only per-district intervention is blocking / unblocking a drain.
- Population figures are synthetic per-district estimates, not census data.
- Auth is a shared access code checked client-side (no backend) — a gate for the demo, not security.

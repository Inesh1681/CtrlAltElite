import { useEffect, useRef, useState } from 'react'
import { AI_ENABLED, explain, fallbackExplanation, type Explanation } from '../ai/explain'
import type { Simulation } from '../hooks/useSimulation'
import { formatSimTime } from '../simulation/engine'

export function AiPanel({ sim, auto }: { sim: Simulation; auto?: boolean }) {
  const [result, setResult] = useState<Explanation | null>(null)
  const [busy, setBusy] = useState(false)
  const [stamp, setStamp] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)
  const lastAutoTick = useRef(-1)

  const input = {
    state: sim.state,
    params: sim.params,
    profile: sim.profile,
    forecast: sim.forecast,
    focusZoneId: sim.selectedZoneId,
    whatIf: sim.whatIf,
  }

  async function run() {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setBusy(true)
    setStamp(formatSimTime(sim.state.minutes))
    // show the deterministic answer immediately; upgrade to Claude if available
    setResult(fallbackExplanation(input))
    try {
      const r = await explain(input, ac.signal)
      if (!ac.signal.aborted) setResult(r)
    } catch {
      /* aborted */
    } finally {
      if (!ac.signal.aborted) setBusy(false)
    }
  }

  // auto-refresh every simulated hour while playing, and when the selected zone changes
  useEffect(() => {
    if (!auto) return
    const tick = sim.state.tick
    if (tick % 12 === 0 && tick !== lastAutoTick.current) {
      lastAutoTick.current = tick
      void run()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.state.tick, auto])

  useEffect(() => {
    if (sim.selectedZoneId) void run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim.selectedZoneId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="label">Analyst</span>
          <span className={`mono rounded px-1.5 py-0.5 text-[9px] ${result?.source === 'claude' ? 'bg-[#0e2a35] text-water' : 'bg-panel-2 text-muted'}`}>
            {AI_ENABLED ? (result?.source === 'claude' ? 'CLAUDE OPUS 5' : busy ? 'CLAUDE · thinking' : 'CLAUDE') : 'RULE ENGINE'}
          </span>
          {stamp && <span className="mono text-[9px] text-dim">@ {stamp}</span>}
        </div>
        <button className="btn h-6" onClick={run} disabled={busy}>
          {busy ? 'Analysing…' : 'Explain now'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {result ? (
          <pre className="whitespace-pre-wrap font-sans text-[11.5px] leading-relaxed text-text">{renderText(result.text)}</pre>
        ) : (
          <div className="text-[11px] text-muted">
            The analyst reads the structured simulation state — never the map — and explains why zones are at risk, which factors dominate, and what to do about it.
            {!AI_ENABLED && <div className="mt-2 text-dim">Set VITE_ANTHROPIC_API_KEY to enable Claude; the deterministic rule engine is active.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function renderText(text: string) {
  return text.split('\n').map((line, i) => {
    const isHead = /^[A-Z][A-Z0-9 —·<>/+%-]+$/.test(line.trim()) && line.trim().length > 3
    return (
      <span key={i} className={isHead ? 'label mt-2 block text-water' : 'block'}>
        {line || ' '}
      </span>
    )
  })
}

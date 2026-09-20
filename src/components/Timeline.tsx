import { Area, Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MAX_MINUTES } from '../hooks/useSimulation'
import { formatSimTime } from '../simulation/engine'
import type { SimSnapshot } from '../simulation/types'

export function Timeline({ history, zonesTotal }: { history: SimSnapshot[]; zonesTotal: number }) {
  const data = history.map((h) => ({
    t: h.minutes,
    rain: Math.round(h.rainfall),
    water: Number((h.avgWater * 100).toFixed(1)), // cm for readability
    high: h.highRiskCount,
    flooded: h.floodedCount,
  }))
  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="g-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.55} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            type="number"
            domain={[0, MAX_MINUTES]}
            ticks={[0, 60, 120, 180, 240, 300, 360]}
            tickFormatter={(v) => formatSimTime(v).replace('T+', '')}
            tick={{ fill: '#5b6576', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
            axisLine={{ stroke: '#1c2431' }}
            tickLine={false}
          />
          <YAxis yAxisId="rain" orientation="right" domain={[0, 160]} hide />
          <YAxis yAxisId="water" domain={[0, 'auto']} tick={{ fill: '#5b6576', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} width={28} />
          <YAxis yAxisId="count" domain={[0, zonesTotal]} hide />
          <Tooltip
            contentStyle={{ background: '#0d1117', border: '1px solid #26303f', borderRadius: 4, fontSize: 11, fontFamily: 'IBM Plex Mono' }}
            labelFormatter={(v) => formatSimTime(Number(v))}
            formatter={(value, name) => {
              const v = Number(value)
              if (name === 'rain') return [`${v} mm/h`, 'rainfall']
              if (name === 'water') return [`${v} cm`, 'avg water']
              if (name === 'high') return [`${v}`, 'high-risk zones']
              if (name === 'flooded') return [`${v}`, 'flooded']
              return [v, String(name)]
            }}
          />
          <Bar yAxisId="rain" dataKey="rain" fill="#3b4a5e" opacity={0.55} isAnimationActive={false} />
          <Area yAxisId="water" dataKey="water" stroke="#22d3ee" strokeWidth={2} fill="url(#g-water)" isAnimationActive={false} />
          <Line yAxisId="count" dataKey="high" stroke="#f2913d" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line yAxisId="count" dataKey="flooded" stroke="#ff2d6f" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Interactive time slider: rewind the simulation to any recorded tick. */
export function TimeScrubber({ tick, maxTick, onScrub, minutesPerTick = 5 }: { tick: number; maxTick: number; onScrub: (t: number) => void; minutesPerTick?: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="label text-[9px]">Time</span>
      <input
        type="range"
        min={0}
        max={Math.max(maxTick, 1)}
        step={1}
        value={tick}
        disabled={maxTick === 0}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="w-40"
        title="Drag to rewind / replay the recorded simulation"
      />
      <span className="mono w-14 text-[10px] text-water">{formatSimTime(tick * minutesPerTick)}</span>
      {tick < maxTick && <span className="mono text-[9px] text-warning">rewound · play resumes here</span>}
    </div>
  )
}

export function TimelineLegend() {
  return (
    <div className="mono flex items-center gap-3 text-[10px] text-muted">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#3b4a5e' }} /> rainfall
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#22d3ee' }} /> avg water (cm)
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-0.5 w-3" style={{ background: '#f2913d' }} /> high-risk
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-0.5 w-3" style={{ background: '#ff2d6f' }} /> flooded
      </span>
    </div>
  )
}

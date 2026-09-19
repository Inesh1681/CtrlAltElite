import { useMemo, useState } from 'react'
import { RISK_COLOR, terrainColor } from '../lib/format'
import { GRID_COLS, GRID_ROWS, riverPath, TERRAIN_SOURCE } from '../simulation/city'
import { computeRisk } from '../simulation/risk'
import type { RiskLevel, SimState, Zone } from '../simulation/types'

const CELL = 100
const GAP = 5
const PAD = 14

interface Props {
  state: SimState
  selectedZoneId: string | null
  onSelect: (id: string | null) => void
  compact?: boolean
  /** show the "press play" hint overlay */
  showHint?: boolean
}

export function CityMap({ state, selectedZoneId, onSelect, compact, showHint }: Props) {
  const [hover, setHover] = useState<string | null>(null)
  const W = GRID_COLS * CELL + PAD * 2
  const H = GRID_ROWS * CELL + PAD * 2
  const byId = useMemo(() => new Map(state.zones.map((z) => [z.id, z])), [state.zones])
  const river = useMemo(() => riverPath(), [])

  const riverD = river
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${PAD + p.x * CELL} ${PAD + p.y * CELL}`)
    .join(' ')

  const hoverZone = hover ? byId.get(hover) : null

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
          </marker>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <pattern id="water-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#22d3ee" strokeWidth="1.2" opacity="0.5" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="#07090d" />

        {/* terrain + water */}
        {state.zones.map((z) => (
          <ZoneCell
            key={z.id}
            z={z}
            selected={selectedZoneId === z.id}
            hovered={hover === z.id}
            compact={compact}
            onClick={() => onSelect(selectedZoneId === z.id ? null : z.id)}
            onHover={() => setHover(z.id)}
          />
        ))}

        {/* river channel */}
        <path d={riverD} fill="none" stroke="#22d3ee" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" opacity="0.07" style={{ pointerEvents: 'none' }} />
        <path d={riverD} fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" strokeDasharray="2 6" style={{ pointerEvents: 'none' }} />

        {/* flow arrows */}
        {state.zones.map((z) => {
          if (!z.dominantOutflowTo || z.outflow < 0.0015) return null
          const t = byId.get(z.dominantOutflowTo)
          if (!t) return null
          const x1 = PAD + z.col * CELL + CELL / 2
          const y1 = PAD + z.row * CELL + CELL / 2
          const x2 = PAD + t.col * CELL + CELL / 2
          const y2 = PAD + t.row * CELL + CELL / 2
          const dx = x2 - x1
          const dy = y2 - y1
          const len = Math.hypot(dx, dy)
          const ux = dx / len
          const uy = dy / len
          const strength = Math.min(1, z.outflow / 0.05)
          return (
            <line
              key={`f-${z.id}`}
              className="flow-line"
              x1={x1 + ux * 22}
              y1={y1 + uy * 22}
              x2={x2 - ux * 30}
              y2={y2 - uy * 30}
              stroke="#22d3ee"
              strokeWidth={1.5 + strength * 2.5}
              opacity={0.25 + strength * 0.6}
              markerEnd="url(#flow-arrow)"
              style={{ pointerEvents: 'none' }}
            />
          )
        })}
      </svg>

      {/* hover tooltip */}
      {hoverZone && hover !== selectedZoneId && <Tooltip z={hoverZone} />}

      {showHint && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <div className="panel flex items-center gap-3 px-4 py-2 text-[12px] shadow-xl" style={{ borderColor: '#22d3ee66' }}>
            <span className="text-water">▶</span>
            <span>
              Press <b>Play</b> or <b>Run Demo</b> to start the storm. Water flows from the hills (light) into the valley and harbour (dark).
            </span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-2">
        <span className="label rounded border border-line bg-panel/80 px-2 py-1 text-[9px]">{TERRAIN_SOURCE}</span>
      </div>
    </div>
  )
}

function ZoneCell({
  z,
  selected,
  hovered,
  compact,
  onClick,
  onHover,
}: {
  z: Zone
  selected: boolean
  hovered: boolean
  compact?: boolean
  onClick: () => void
  onHover: () => void
}) {
  const risk = computeRisk(z)
  const x = PAD + z.col * CELL + GAP / 2
  const y = PAD + z.row * CELL + GAP / 2
  const s = CELL - GAP
  const ratio = Math.min(1, z.waterLevel / z.floodThreshold)
  const waterOpacity = z.waterLevel < 0.01 ? 0 : 0.12 + ratio * 0.7
  const color = RISK_COLOR[risk.level]
  const hot = risk.level === 'CRITICAL' || risk.level === 'FLOODED'
  const strokeW = selected ? 3 : hot ? 2.5 : risk.level === 'SAFE' ? 1 : 1.75
  // water fills from the bottom of the cell, like a gauge
  const waterH = Math.max(0, Math.min(s, ratio * s))

  return (
    <g onClick={onClick} onMouseEnter={onHover} style={{ cursor: 'pointer' }}>
      <rect x={x} y={y} width={s} height={s} rx="3" fill={terrainColor(z.elevation)} />
      {/* subtle elevation contour lines */}
      <rect x={x + 6} y={y + 6} width={s - 12} height={s - 12} rx="2" fill="none" stroke="#ffffff" strokeOpacity={0.03 + (z.elevation / 32) * 0.06} />
      {/* water gauge */}
      <rect className="zone-water" x={x} y={y + s - waterH} width={s} height={waterH} rx="3" fill="#22d3ee" opacity={waterOpacity} />
      {risk.level === 'FLOODED' && <rect x={x} y={y} width={s} height={s} rx="3" fill="url(#water-hatch)" opacity="0.6" />}
      {/* risk frame */}
      <rect
        className={`zone-frame ${hot ? 'pulse' : ''}`}
        x={x}
        y={y}
        width={s}
        height={s}
        rx="3"
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        opacity={risk.level === 'SAFE' && !selected && !hovered ? 0.35 : 1}
        filter={hot || selected ? 'url(#glow)' : undefined}
      />
      {(selected || hovered) && <rect x={x} y={y} width={s} height={s} rx="3" fill="#ffffff" opacity={selected ? 0.06 : 0.04} />}
      {z.isInlet && (
        <text x={x + 7} y={y + 32} fontSize="9" fontFamily="IBM Plex Mono, monospace" fill="#22d3ee" opacity="0.85">
          ▶ RIVER INLET
        </text>
      )}
      {/* labels: name, status, water depth (id and elevation live in the tooltip) */}
      {!compact && (
        <text x={x + 8} y={y + 18} fontSize="12" fontFamily="Inter, sans-serif" fontWeight={600} fill="#e6e9ef" opacity="0.92">
          {z.name}
        </text>
      )}
      <text x={x + 7} y={y + s - 9} fontSize="10" fontFamily="IBM Plex Mono, monospace" fill={color} fontWeight={600}>
        {risk.level}
      </text>
      {z.waterLevel >= 0.05 && (
        <text x={x + s - 7} y={y + s - 9} fontSize="10" fontFamily="IBM Plex Mono, monospace" fill="#a5f3fc" textAnchor="end">
          {z.waterLevel.toFixed(2)}m
        </text>
      )}
    </g>
  )
}

function Tooltip({ z }: { z: Zone }) {
  const r = computeRisk(z)
  // position: place near the cell, converted from grid coords into % of container
  const left = ((z.col + (z.col >= GRID_COLS - 2 ? -1.15 : 1.05)) / GRID_COLS) * 100
  const top = (z.row / GRID_ROWS) * 100
  return (
    <div
      className="panel pointer-events-none absolute z-10 min-w-[170px] p-2 text-[11px] shadow-xl"
      style={{ left: `${left}%`, top: `${top}%`, borderColor: RISK_COLOR[r.level] + '66' }}
    >
      <div className="flex items-center justify-between">
        <span className="mono text-muted">{z.id}</span>
        <span className="mono font-semibold" style={{ color: RISK_COLOR[r.level] }}>
          {r.level}
        </span>
      </div>
      <div className="font-medium">{z.name}</div>
      <div className="mono mt-1 grid grid-cols-2 gap-x-3 text-[10px] text-muted">
        <span>elevation</span>
        <span className="text-right text-text">{z.elevation.toFixed(1)} m</span>
        <span>water</span>
        <span className="text-right text-text">
          {z.waterLevel.toFixed(2)} / {z.floodThreshold.toFixed(2)} m
        </span>
        <span>drain load</span>
        <span className="text-right text-text">{Math.round(z.drainageUtilization * 100)}%</span>
        <span>risk</span>
        <span className="text-right text-text">{Math.round(r.score * 100)}</span>
      </div>
    </div>
  )
}

export function RiskLegend() {
  const levels: RiskLevel[] = ['SAFE', 'WATCH', 'WARNING', 'CRITICAL', 'FLOODED']
  return (
    <div className="flex items-center gap-4">
      {levels.map((l) => (
        <span key={l} className="mono flex items-center gap-1.5 text-[10px] text-muted">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: RISK_COLOR[l] }} />
          {l}
        </span>
      ))}
      <span className="mono flex items-center gap-1.5 text-[10px] text-muted">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ background: '#22d3ee' }} />
        WATER · FLOW
      </span>
    </div>
  )
}

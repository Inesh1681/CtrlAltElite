import type { Alert } from '../simulation/alerts'
import { RISK_COLOR } from '../lib/format'
import { formatSimTime } from '../simulation/engine'

export function AlertsFeed({ alerts, onSelect, limit }: { alerts: Alert[]; onSelect: (id: string) => void; limit?: number }) {
  const list = limit ? alerts.slice(0, limit) : alerts
  if (list.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-[11px] text-muted">
        No active alerts. Warnings are raised the moment a district crosses a risk threshold.
      </div>
    )
  }
  return (
    <ul className="divide-y divide-line">
      {list.map((a) => (
        <li key={a.id} className="cursor-pointer px-3 py-2 hover:bg-panel-2" onClick={() => onSelect(a.zoneId)}>
          <div className="flex items-center justify-between">
            <span className="mono text-[10px] font-semibold" style={{ color: RISK_COLOR[a.level] }}>
              ● {a.level}
            </span>
            <span className="mono text-[10px] text-muted">{formatSimTime(a.minutes)}</span>
          </div>
          <div className="mt-0.5 text-[11.5px] leading-snug">{a.message}</div>
          <div className="mt-0.5 text-[10px] text-dim">Driven by {a.reason}</div>
        </li>
      ))}
    </ul>
  )
}

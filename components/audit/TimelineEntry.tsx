'use client'

import type { AuditEntry } from '@/actions/getAuditLog'
import { EVENT_CONFIG, relativeTime, absoluteTime } from './eventConfig'
import { TradeCardBody } from './TradeCardBody'

export function TimelineEntry({ entry, isFocused }: { entry: AuditEntry; isFocused: boolean }) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const isAccepted = entry.action === 'trade_accepted'
  const isAdvancedExecuted = entry.action === 'advanced_trade_executed'

  const borderClass =
    isAccepted || isAdvancedExecuted
      ? `border-l-[4px] bg-green-50/50 ${isFocused ? 'border-l-yvy-accent' : 'border-l-[#16a34a]'}`
      : `${isFocused ? 'border-l-[4px] border-l-yvy-accent' : `border-l-[3px] ${cfg.borderColor}`}`

  const timeSlot = (
    <div className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5">
      <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
      <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
    </div>
  )

  return (
    <div data-focused={isFocused || undefined}>
      <TradeCardBody entry={entry} borderClass={borderClass} timeSlot={timeSlot} />
    </div>
  )
}

'use client'

import { useState } from 'react'
import type { AuditEntry } from '@/actions/getAuditLog'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { formatName } from '@/lib/format'
import { EVENT_CONFIG, TRADE_ACTIONS, relativeTime, absoluteTime } from './eventConfig'
import { TradeCardBody } from './TradeCardBody'
import { RollbackControl } from './RollbackControl'
import { AdvancedRollbackControl } from './AdvancedRollbackControl'
import { TradeAssistant } from './TradeAssistant'

export function TimelineEntry({
  entry,
  isFocused,
  userId,
}: {
  entry: AuditEntry
  isFocused: boolean
  userId?: string
}) {
  const cfg = EVENT_CONFIG[entry.action]
  const [assistantOpen, setAssistantOpen] = useState(false)
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  if (!cfg) return null

  const isTrade = TRADE_ACTIONS.has(entry.action)
  const isAccepted = entry.action === 'trade_accepted'
  const isAdvancedExecuted = entry.action === 'advanced_trade_executed'
  const isCanceled =
    entry.action === 'trade_cancelled' || entry.action === 'advanced_trade_cancelled'
  const isRejected = entry.action === 'trade_rejected' || entry.action === 'advanced_trade_rejected'

  const tradeId = isAccepted ? (entry.metadata.tradeId as string | undefined) : undefined
  const advancedTradeId = isAdvancedExecuted
    ? (entry.metadata.tradeId as string | undefined)
    : undefined

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasTradeStickers = isTrade && (givingIds.length > 0 || receivingIds.length > 0)

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
    <>
      <div data-focused={isFocused || undefined}>
        <TradeCardBody entry={entry} borderClass={borderClass} timeSlot={timeSlot}>
          {userId && hasTradeStickers && !isCanceled && !isRejected && (
            <button
              onClick={() => setAssistantOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>📋</span>
              Assistente de troca
            </button>
          )}
          {userId && tradeId && (
            <RollbackControl
              tradeId={tradeId}
              userId={userId}
              partnerName={formatName(entry.metadata.partnerName as string)}
              givingIds={givingIds}
              receivingIds={receivingIds}
            />
          )}
          {userId && advancedTradeId && (
            <AdvancedRollbackControl tradeId={advancedTradeId} userId={userId} />
          )}
        </TradeCardBody>
      </div>

      {assistantOpen && hasTradeStickers && (
        <TradeAssistant
          partnerName={formatName(entry.metadata.partnerName as string)}
          givingIds={givingIds}
          receivingIds={receivingIds}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </>
  )
}

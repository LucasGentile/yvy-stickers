'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AuditEntry } from '@/actions/getAuditLog'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { formatName } from '@/lib/format'
import { RollbackControl } from './RollbackControl'
import { AdvancedRollbackControl } from './AdvancedRollbackControl'
import { ImportAssistant } from './ImportAssistant'
import { TradeAssistant } from './TradeAssistant'
import { TradeCardBody } from './TradeCardBody'
import { EVENT_CONFIG, TRADE_ACTIONS, relativeTime, absoluteTime, isRecent } from './eventConfig'

export function EventCard({ entry, userId }: { entry: AuditEntry; userId: string }) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const [assistantOpen, setAssistantOpen] = useState(false)
  const [importAssistantOpen, setImportAssistantOpen] = useState(false)
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  const isTrade = TRADE_ACTIONS.has(entry.action)
  const isAccepted = entry.action === 'trade_accepted'
  const isAdvancedExecuted = entry.action === 'advanced_trade_executed'
  const isCanceled =
    entry.action === 'trade_cancelled' || entry.action === 'advanced_trade_cancelled'
  const isRejected = entry.action === 'trade_rejected' || entry.action === 'advanced_trade_rejected'

  const hint = cfg.realLifeHint?.(
    entry.metadata.partnerName
      ? {
          ...entry.metadata,
          partnerName: formatName(formatName(entry.metadata.partnerName as string)),
        }
      : entry.metadata
  )

  const tradeId = isAccepted ? (entry.metadata.tradeId as string | undefined) : undefined
  const advancedTradeId = isAdvancedExecuted
    ? (entry.metadata.tradeId as string | undefined)
    : undefined

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasTradeStickers = isTrade && (givingIds.length > 0 || receivingIds.length > 0)

  if (!isTrade) {
    const label = cfg.label(entry.metadata)
    const detail = cfg.detail(entry.metadata)
    const importAlbumIds =
      entry.action === 'file_import'
        ? ((entry.metadata.addedToAlbumIds as string[] | undefined) ?? [])
        : []
    const importDupeIds =
      entry.action === 'file_import'
        ? ((entry.metadata.duplicateIds as string[] | undefined) ?? [])
        : []
    const hasImportStickers = importAlbumIds.length > 0 || importDupeIds.length > 0

    return (
      <div className="space-y-1 py-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm shrink-0 leading-none">{cfg.icon}</span>
          <span className="text-xs flex-1 min-w-0 leading-snug">
            <span className="font-medium text-yvy-dark/60">{label}</span>
            <span className="text-yvy-muted"> · {detail}</span>
          </span>
          <div className="flex flex-col items-end shrink-0 gap-px">
            <span className="text-[10px] text-yvy-muted/70">{relativeTime(entry.created_at)}</span>
            <span className="text-[9px] text-yvy-muted/40">{absoluteTime(entry.created_at)}</span>
          </div>
        </div>
        {hint &&
          isRecent(entry.created_at) &&
          hint
            .split('\n')
            .filter(Boolean)
            .map((h, i) => (
              <div key={i} className="flex items-start gap-1 pl-5">
                <span className="text-amber-400 text-[10px] shrink-0 mt-px">⚑</span>
                <p className="text-[11px] text-amber-600 leading-snug">{h}</p>
              </div>
            ))}
        {hasImportStickers && (
          <div className="pl-5 pt-0.5">
            <button
              onClick={() => setImportAssistantOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>📋</span>
              Assistente de importação
            </button>
          </div>
        )}
        {importAssistantOpen && hasImportStickers && (
          <ImportAssistant
            addedToAlbumIds={importAlbumIds}
            duplicateIds={importDupeIds}
            onClose={() => setImportAssistantOpen(false)}
          />
        )}
      </div>
    )
  }

  const borderClass =
    isAccepted || isAdvancedExecuted
      ? 'border-l-[4px] border-l-[#16a34a] bg-green-50/50'
      : `border-l-[3px] ${cfg.borderColor}`

  const timeSlot = (
    <Link
      href={`/history/${entry.id}`}
      className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5 hover:opacity-70 transition-opacity"
    >
      <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
      <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
    </Link>
  )

  return (
    <>
      <TradeCardBody entry={entry} borderClass={borderClass} timeSlot={timeSlot}>
        {hasTradeStickers && isRecent(entry.created_at) && isAccepted && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-amber-500 text-[10px] shrink-0">⚑</span>
            <span className="text-[11px] text-amber-700 font-medium">
              Combine com {formatName(entry.metadata.partnerName as string)} para trocar fisicamente
            </span>
          </div>
        )}
        {hasTradeStickers && isRecent(entry.created_at) && isAdvancedExecuted && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-amber-500 text-[10px] shrink-0">⚑</span>
            <span className="text-[11px] text-amber-700 font-medium">
              Combine com {((entry.metadata.partners as string[]) ?? []).join(' e ')} para trocar
              fisicamente
            </span>
          </div>
        )}
        {hasTradeStickers && !isCanceled && !isRejected && (
          <button
            onClick={() => setAssistantOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <span>📋</span>
            Assistente de troca
          </button>
        )}
        {hint && !hasTradeStickers && isRecent(entry.created_at) && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <span className="text-amber-500 text-[10px] shrink-0 mt-px">⚑</span>
            <p className="text-[11px] text-amber-700 font-medium leading-snug whitespace-pre-line">
              {hint}
            </p>
          </div>
        )}
        {tradeId && (
          <RollbackControl
            tradeId={tradeId}
            userId={userId}
            partnerName={formatName(entry.metadata.partnerName as string)}
            givingIds={givingIds}
            receivingIds={receivingIds}
          />
        )}
        {advancedTradeId && <AdvancedRollbackControl tradeId={advancedTradeId} userId={userId} />}
      </TradeCardBody>

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

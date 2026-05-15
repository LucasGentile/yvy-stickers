'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AuditEntry } from '@/actions/getAuditLog'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { formatName } from '@/lib/format'
import { StickerChip } from '../StickerChip'
import { RollbackControl } from './RollbackControl'
import { ImportAssistant } from './ImportAssistant'
import { TradeAssistant } from './TradeAssistant'
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

  const normalizedMetadata = entry.metadata.partnerName
    ? {
        ...entry.metadata,
        partnerName: formatName(formatName(entry.metadata.partnerName as string)),
      }
    : entry.metadata

  const label = cfg.label(normalizedMetadata)
  const detail = cfg.detail(normalizedMetadata)
  const hint = cfg.realLifeHint?.(normalizedMetadata)

  const tradeId = isAccepted ? (entry.metadata.tradeId as string | undefined) : undefined

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasTradeStickers = isTrade && (givingIds.length > 0 || receivingIds.length > 0)

  if (!isTrade) {
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

  return (
    <div
      className={`flex gap-3 px-3 py-2 rounded-r-md ${
        isAccepted || isAdvancedExecuted
          ? 'border-l-[4px] border-l-[#16a34a] bg-green-50/50'
          : `border-l-[3px] ${cfg.borderColor}`
      }`}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-yvy-dark leading-snug">{label}</p>
          <Link
            href={`/history/${entry.id}`}
            className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5 hover:opacity-70 transition-opacity"
          >
            <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
            <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
          </Link>
        </div>
        <p className="text-xs text-yvy-muted mt-0.5">{detail}</p>

        {hasTradeStickers && (
          <div className="mt-2 space-y-2.5">
            {isRecent(entry.created_at) && isAccepted && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 text-[10px] shrink-0">⚑</span>
                <span className="text-[11px] text-amber-700 font-medium">
                  Combine com {formatName(entry.metadata.partnerName as string)} para trocar
                  fisicamente
                </span>
              </div>
            )}
            {isRecent(entry.created_at) && isAdvancedExecuted && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 text-[10px] shrink-0">⚑</span>
                <span className="text-[11px] text-amber-700 font-medium">
                  Combine com {((entry.metadata.partners as string[]) ?? []).join(' e ')} para
                  trocar fisicamente
                </span>
              </div>
            )}
            {givingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 mb-1.5">
                  {entry.action === 'trade_rolled_back'
                    ? 'Você recuperou ←'
                    : `Você ${isAccepted || isAdvancedExecuted ? 'deu' : 'dá'} para ${isAdvancedExecuted ? (entry.metadata.giveToName as string) : ''} →`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {givingIds.map((id) => (
                    <StickerChip
                      key={id}
                      id={id}
                      variant={entry.action === 'trade_rolled_back' ? 'receiving' : 'giving'}
                    />
                  ))}
                </div>
              </div>
            )}
            {receivingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1.5">
                  {entry.action === 'trade_rolled_back'
                    ? '→ Você devolveu'
                    : `← Você ${isAccepted || isAdvancedExecuted ? 'recebeu' : 'recebe'} de ${isAdvancedExecuted ? (entry.metadata.receiveFromName as string) : ''}`}
                </p>
                <div className="flex flex-wrap gap-1">
                  {receivingIds.map((id) => (
                    <StickerChip
                      key={id}
                      id={id}
                      variant={entry.action === 'trade_rolled_back' ? 'giving' : 'receiving'}
                    />
                  ))}
                </div>
              </div>
            )}
            {isAdvancedExecuted &&
              ((entry.metadata.thirdPartyIds as string[] | undefined) ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 mb-1.5">
                    {entry.metadata.thirdPartyFromName as string} dá para{' '}
                    {entry.metadata.thirdPartyToName as string}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sort((entry.metadata.thirdPartyIds as string[]) ?? []).map((id) => (
                      <StickerChip key={id} id={id} variant="third-party" />
                    ))}
                  </div>
                </div>
              )}
            <button
              onClick={() => setAssistantOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>📋</span>
              Assistente de troca
            </button>
          </div>
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
      </div>

      {assistantOpen && hasTradeStickers && (
        <TradeAssistant
          partnerName={formatName(entry.metadata.partnerName as string)}
          givingIds={givingIds}
          receivingIds={receivingIds}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </div>
  )
}

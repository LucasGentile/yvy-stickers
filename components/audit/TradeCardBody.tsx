'use client'

import type { AuditEntry } from '@/actions/getAuditLog'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { formatName } from '@/lib/format'
import { StickerChip } from '../StickerChip'
import { EVENT_CONFIG } from './eventConfig'

export function TradeCardBody({
  entry,
  borderClass,
  timeSlot,
  children,
}: {
  entry: AuditEntry
  borderClass: string
  timeSlot: React.ReactNode
  children?: React.ReactNode
}) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  const normalizedMetadata = entry.metadata.partnerName
    ? {
        ...entry.metadata,
        partnerName: formatName(formatName(entry.metadata.partnerName as string)),
      }
    : entry.metadata

  const label = cfg.label(normalizedMetadata)
  const detail = cfg.detail(normalizedMetadata)

  const isAccepted = entry.action === 'trade_accepted'
  const isAdvancedExecuted = entry.action === 'advanced_trade_executed'
  const isCanceled =
    entry.action === 'trade_cancelled' ||
    entry.action === 'trade_rejected' ||
    entry.action === 'advanced_trade_cancelled' ||
    entry.action === 'advanced_trade_rejected'

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasStickers = givingIds.length > 0 || receivingIds.length > 0

  return (
    <div className={`flex gap-3 px-3 py-2 rounded-r-md w-full ${borderClass}`}>
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-yvy-dark leading-snug">{label}</p>
          {timeSlot}
        </div>
        <p className="text-xs text-yvy-muted mt-0.5">{detail}</p>

        {hasStickers && (
          <div className="mt-2 space-y-2">
            {givingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 mb-1">
                  {entry.action === 'trade_rolled_back'
                    ? `Você recuperou ${givingIds.length} ←`
                    : `Você ${isAccepted || isAdvancedExecuted ? 'deu' : isCanceled ? 'daria' : 'dá'} ${givingIds.length} para ${isAdvancedExecuted ? (entry.metadata.giveToName as string) : ''} →`}
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
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1">
                  {entry.action === 'trade_rolled_back'
                    ? `→ Você devolveu ${receivingIds.length}`
                    : `← Você ${isAccepted || isAdvancedExecuted ? 'recebeu' : isCanceled ? 'receberia' : 'recebe'} ${receivingIds.length} de ${isAdvancedExecuted ? (entry.metadata.receiveFromName as string) : ''}`}
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
            {isAccepted && !!entry.metadata.isPartial && (
              <>
                {((entry.metadata.excludedGivingIds as string[] | undefined) ?? []).length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                      Removida da proposta · não deu{' '}
                      {((entry.metadata.excludedGivingIds as string[]) ?? []).length}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {sort((entry.metadata.excludedGivingIds as string[]) ?? []).map((id) => (
                        <span
                          key={id}
                          className="font-mono text-[11px] px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 line-through opacity-70"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {((entry.metadata.excludedReceivingIds as string[] | undefined) ?? []).length >
                  0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
                      Removida da proposta · não recebeu{' '}
                      {((entry.metadata.excludedReceivingIds as string[]) ?? []).length}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {sort((entry.metadata.excludedReceivingIds as string[]) ?? []).map((id) => (
                        <span
                          key={id}
                          className="font-mono text-[11px] px-2 py-0.5 rounded-md border bg-amber-50 border-amber-200 text-amber-700 line-through opacity-70"
                        >
                          {id}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {isAdvancedExecuted &&
              ((entry.metadata.thirdPartyIds as string[] | undefined) ?? []).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 mb-1">
                    {entry.metadata.thirdPartyFromName as string} dá{' '}
                    {((entry.metadata.thirdPartyIds as string[]) ?? []).length} para{' '}
                    {entry.metadata.thirdPartyToName as string}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {sort((entry.metadata.thirdPartyIds as string[]) ?? []).map((id) => (
                      <StickerChip key={id} id={id} variant="third-party" />
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

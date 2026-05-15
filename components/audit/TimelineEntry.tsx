'use client'

import type { AuditEntry } from '@/actions/getAuditLog'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { formatName } from '@/lib/format'
import { StickerChip } from '../StickerChip'
import { EVENT_CONFIG, absoluteTime, relativeTime } from './eventConfig'

export function TimelineEntry({ entry, isFocused }: { entry: AuditEntry; isFocused: boolean }) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  const normalizedMetadata = entry.metadata.partnerName
    ? {
        ...entry.metadata,
        partnerName: formatName(entry.metadata.partnerName as string),
      }
    : entry.metadata

  const label = cfg.label(normalizedMetadata)
  const detail = cfg.detail(normalizedMetadata)

  const isAccepted = entry.action === 'trade_accepted'
  const isAdvancedExecuted = entry.action === 'advanced_trade_executed'

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasStickers = givingIds.length > 0 || receivingIds.length > 0

  return (
    <div
      className={`flex gap-3 pl-3 pr-3 py-3 rounded-r-md ${
        isFocused
          ? 'border-l-[4px] border-l-yvy-accent bg-yvy-accent/5'
          : isAccepted || isAdvancedExecuted
            ? 'border-l-[4px] border-l-[#16a34a] bg-green-50/50'
            : `border-l-[3px] ${cfg.borderColor}`
      }`}
      data-focused={isFocused || undefined}
    >
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold text-yvy-dark leading-snug">{label}</p>
          <div className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5 pl-2">
            <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
            <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
          </div>
        </div>
        <p className="text-xs text-yvy-muted mt-0.5">{detail}</p>

        {hasStickers && (
          <div className="mt-2 space-y-2">
            {givingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 mb-1">
                  {entry.action === 'trade_rolled_back'
                    ? 'Recuperou ←'
                    : `${isAccepted || isAdvancedExecuted ? 'Deu' : 'Dá'} →`}
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
                    ? '→ Devolveu'
                    : `← ${isAccepted || isAdvancedExecuted ? 'Recebeu' : 'Recebe'}`}
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
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-500 mb-1">
                    {entry.metadata.thirdPartyFromName as string} →{' '}
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
      </div>
    </div>
  )
}

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
      className={`relative pl-10 py-4 first:pt-0 last:pb-0 ${
        isFocused ? 'bg-green-50 -mx-2 px-12 rounded-xl border border-yvy-accent/30' : ''
      }`}
      data-focused={isFocused || undefined}
    >
      {/* Timeline dot */}
      <div
        className={`absolute left-[13px] top-3 w-[11px] h-[11px] rounded-full border-2 ${
          isFocused ? 'border-yvy-accent bg-yvy-accent' : 'border-yvy-border bg-yvy-surface'
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{cfg.icon}</span>
          <p className="text-sm font-semibold text-yvy-dark leading-snug truncate">{label}</p>
        </div>
        <div className="flex flex-col items-end shrink-0 gap-0.5">
          <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
          <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
        </div>
      </div>

      {/* Detail */}
      <p className="text-xs text-yvy-muted mt-0.5 ml-7">{detail}</p>

      {/* Stickers */}
      {hasStickers && (
        <div className="mt-2 ml-7 space-y-2">
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

      {/* Focused indicator */}
      {isFocused && (
        <div className="mt-2 ml-7">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yvy-accent/10 text-yvy-accent text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-yvy-accent" />
            Evento selecionado
          </span>
        </div>
      )}
    </div>
  )
}

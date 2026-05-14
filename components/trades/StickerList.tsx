'use client'

import { isChromeSticker, isCocaColaSticker, sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'

export function StickerList({ ids, label }: { ids: string[]; label: string }) {
  const { stickerOrder } = usePrefs()
  if (ids.length === 0) return null
  const sorted = stickerOrder === 'album' ? sortByAlbumOrder(ids) : sortAlphabetically(ids)
  const chromeCount = ids.filter(isChromeSticker).length
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
        {label}
        {chromeCount > 0 && (
          <span className="ml-1.5 text-amber-600 normal-case font-medium">
            · ✨ {chromeCount} cromada{chromeCount !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1">
        {sorted.map((id) => (
          <span
            key={id}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-bg border border-yvy-border text-yvy-text"
          >
            {isChromeSticker(id) ? (
              <span className="font-bold text-amber-500">{id}</span>
            ) : isCocaColaSticker(id) ? (
              <span className="font-bold text-red-500">{id}</span>
            ) : (
              id
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

export function StickerToggle({
  ids,
  label,
  selected,
  onToggle,
}: {
  ids: string[]
  label: string
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  const { stickerOrder } = usePrefs()
  if (ids.length === 0) return null
  const sorted = stickerOrder === 'album' ? sortByAlbumOrder(ids) : sortAlphabetically(ids)
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {sorted.map((id) => {
          const isSelected = selected.has(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                isSelected
                  ? 'bg-amber-500 border-amber-500 text-white font-semibold'
                  : 'bg-yvy-bg border-yvy-border text-yvy-text hover:border-amber-400'
              }`}
            >
              {isChromeSticker(id) ? (
                <span className={isSelected ? 'text-white' : 'text-amber-500'}>{id}</span>
              ) : isCocaColaSticker(id) ? (
                <span className={isSelected ? 'text-white' : 'text-red-500'}>{id}</span>
              ) : (
                id
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

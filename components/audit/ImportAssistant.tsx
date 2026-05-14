'use client'

import { useState } from 'react'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { StickerChip } from '../StickerChip'

export function ImportAssistant({
  addedToAlbumIds,
  duplicateIds,
  onClose,
}: {
  addedToAlbumIds: string[]
  duplicateIds: string[]
  onClose: () => void
}) {
  const [checkedAlbum, setCheckedAlbum] = useState<Set<string>>(new Set())
  const [checkedDupes, setCheckedDupes] = useState<Set<string>>(new Set())
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically
  const sortedAlbum = sort(addedToAlbumIds)
  const sortedDupes = sort(duplicateIds)

  const allAlbumDone = sortedAlbum.length > 0 && checkedAlbum.size === sortedAlbum.length
  const allDupesDone = sortedDupes.length > 0 && checkedDupes.size === sortedDupes.length

  function toggle(set: Set<string>, setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-yvy-surface rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-yvy-border shrink-0">
          <div>
            <p className="text-sm font-bold text-yvy-dark">Assistente de importação</p>
            <p className="text-[11px] text-yvy-muted">Toque para marcar cada figurinha separada</p>
          </div>
          <button onClick={onClose} className="text-yvy-muted text-xl leading-none px-1">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {sortedAlbum.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-green-600">Para colar no álbum →</p>
                <p className={`text-[11px] font-medium ${allAlbumDone ? 'text-green-600' : 'text-yvy-muted'}`}>
                  {allAlbumDone ? 'Tudo colado ✓' : `${checkedAlbum.size}/${sortedAlbum.length} coladas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedAlbum.map((id) => (
                  <StickerChip key={id} id={id} variant="green" size="md" checked={checkedAlbum.has(id)} onToggle={() => toggle(checkedAlbum, setCheckedAlbum, id)} />
                ))}
              </div>
            </div>
          )}

          {sortedDupes.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-500">Para separar como repetidas →</p>
                <p className={`text-[11px] font-medium ${allDupesDone ? 'text-green-600' : 'text-yvy-muted'}`}>
                  {allDupesDone ? 'Tudo separado ✓' : `${checkedDupes.size}/${sortedDupes.length} separadas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedDupes.map((id) => (
                  <StickerChip key={id} id={id} variant="amber" size="md" checked={checkedDupes.has(id)} onToggle={() => toggle(checkedDupes, setCheckedDupes, id)} />
                ))}
              </div>
            </div>
          )}

          <button onClick={onClose} className="w-full border border-yvy-border text-yvy-text font-semibold py-3 rounded-xl text-sm mt-2">
            Fechar assistente
          </button>
        </div>
      </div>
    </div>
  )
}

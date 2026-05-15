'use client'

import { useState } from 'react'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { StickerChip } from '../StickerChip'

export function TradeAssistant({
  partnerName: _partnerName,
  givingIds,
  receivingIds,
  onClose,
  onVerify,
}: {
  partnerName: string
  givingIds: string[]
  receivingIds: string[]
  onClose: () => void
  onVerify?: () => Promise<void>
}) {
  const [checkedGiving, setCheckedGiving] = useState<Set<string>>(new Set())
  const [checkedReceiving, setCheckedReceiving] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically
  const sortedGiving = sort(givingIds)
  const sortedReceiving = sort(receivingIds)

  function toggleGiving(id: string) {
    setCheckedGiving((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function toggleReceiving(id: string) {
    setCheckedReceiving((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  async function handleVerify() {
    if (!onVerify) return
    setVerifying(true)
    try {
      await onVerify()
      onClose()
    } catch {
      setVerifying(false)
      setConfirming(false)
    }
  }

  const allGivingDone = givingIds.length > 0 && checkedGiving.size === givingIds.length
  const allReceivingDone = receivingIds.length > 0 && checkedReceiving.size === receivingIds.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={verifying ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg bg-yvy-surface rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-yvy-border shrink-0">
          <div>
            <p className="text-sm font-bold text-yvy-dark">Assistente de troca</p>
            <p className="text-[11px] text-yvy-muted">Toque para marcar cada figurinha separada</p>
          </div>
          <button
            onClick={onClose}
            disabled={verifying}
            className="text-yvy-muted text-xl leading-none px-1 disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {givingIds.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-500">
                  Você vai dar →
                </p>
                <p
                  className={`text-[11px] font-medium ${allGivingDone ? 'text-green-600' : 'text-yvy-muted'}`}
                >
                  {allGivingDone
                    ? 'Tudo separado ✓'
                    : `${checkedGiving.size}/${givingIds.length} separadas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedGiving.map((id) => (
                  <StickerChip
                    key={id}
                    id={id}
                    variant="giving"
                    size="md"
                    checked={checkedGiving.has(id)}
                    onToggle={() => toggleGiving(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {receivingIds.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                  ← Você vai receber
                </p>
                <p
                  className={`text-[11px] font-medium ${allReceivingDone ? 'text-green-600' : 'text-yvy-muted'}`}
                >
                  {allReceivingDone
                    ? 'Tudo conferido ✓'
                    : `${checkedReceiving.size}/${receivingIds.length} conferidas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedReceiving.map((id) => (
                  <StickerChip
                    key={id}
                    id={id}
                    variant="receiving"
                    size="md"
                    checked={checkedReceiving.has(id)}
                    onToggle={() => toggleReceiving(id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            {onVerify && !confirming && (
              <button
                onClick={() => setConfirming(true)}
                disabled={verifying}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Completar
              </button>
            )}

            {onVerify && confirming && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                <p className="text-xs text-emerald-800 font-medium">
                  Confirmar que a troca física foi realizada?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={verifying}
                    className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {verifying ? 'Salvando...' : 'Sim, completar'}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              disabled={verifying}
              className="w-full border border-yvy-border text-yvy-text font-semibold py-3 rounded-xl text-sm disabled:opacity-50"
            >
              Fechar assistente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

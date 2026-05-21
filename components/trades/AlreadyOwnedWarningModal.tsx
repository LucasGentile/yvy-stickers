'use client'

import { StickerChip } from '@/components/StickerChip'

export function AlreadyOwnedWarningModal({
  open,
  myAlreadyOwnedIds,
  theirAlreadyOwnedIds,
  otherUserName,
  onConfirm,
  onReject,
  onDismiss,
  loading,
}: {
  open: boolean
  myAlreadyOwnedIds: string[]
  theirAlreadyOwnedIds: string[]
  otherUserName: string
  onConfirm: () => void
  onReject: () => void
  onDismiss: () => void
  loading?: 'confirm' | 'reject' | null
}) {
  if (!open) return null

  const firstName = otherUserName.split(' ')[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-[90vw] max-w-sm rounded-2xl border border-yvy-border bg-yvy-surface p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-sm font-bold text-yvy-dark">Troca com figurinhas redundantes</h2>
          <button
            onClick={onDismiss}
            className="text-yvy-muted hover:text-yvy-dark text-lg leading-none -mt-1"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {myAlreadyOwnedIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-yvy-muted leading-relaxed">
              {myAlreadyOwnedIds.length === 1
                ? 'Você já tem a figurinha abaixo no seu álbum. Recebê-la resultará em uma duplicata desnecessária:'
                : 'Você já tem as figurinhas abaixo no seu álbum. Recebê-las resultará em duplicatas desnecessárias:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {myAlreadyOwnedIds.map((id) => (
                <StickerChip key={id} id={id} variant="already-owned" />
              ))}
            </div>
          </div>
        )}

        {theirAlreadyOwnedIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-yvy-muted leading-relaxed">
              {theirAlreadyOwnedIds.length === 1
                ? `${firstName} já tem a figurinha abaixo. Dar essa figurinha resultará em uma duplicata desnecessária para ${firstName}:`
                : `${firstName} já tem as figurinhas abaixo. Dar essas figurinhas resultará em duplicatas desnecessárias para ${firstName}:`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {theirAlreadyOwnedIds.map((id) => (
                <StickerChip key={id} id={id} variant="already-owned" />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-yvy-muted leading-relaxed">
          Sugerimos recusar a troca para que ambos possam encontrar combinações melhores.
        </p>

        <div className="space-y-2">
          <button
            onClick={onReject}
            disabled={loading !== null && loading !== undefined}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading === 'reject' ? 'Recusando...' : 'Recusar troca'}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading !== null && loading !== undefined}
            className="w-full border border-yvy-border text-yvy-text font-semibold py-2.5 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
          >
            {loading === 'confirm' ? 'Confirmando...' : 'Confirmar mesmo assim'}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { StickerChip } from '@/components/StickerChip'

export function AlreadyOwnedWarningModal({
  open,
  alreadyOwnedIds,
  onConfirm,
  onReject,
  onDismiss,
  loading,
}: {
  open: boolean
  alreadyOwnedIds: string[]
  onConfirm: () => void
  onReject: () => void
  onDismiss: () => void
  loading?: 'confirm' | 'reject' | null
}) {
  if (!open) return null

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
          <h2 className="text-sm font-bold text-yvy-dark">Você já tem essa figurinha</h2>
          <button
            onClick={onDismiss}
            className="text-yvy-muted hover:text-yvy-dark text-lg leading-none -mt-1"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-yvy-muted leading-relaxed">
          {alreadyOwnedIds.length === 1
            ? 'A figurinha abaixo já faz parte do seu álbum. Aceitar esta troca resultará em uma duplicata desnecessária.'
            : 'As figurinhas abaixo já fazem parte do seu álbum. Aceitar esta troca resultará em duplicatas desnecessárias.'}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {alreadyOwnedIds.map((id) => (
            <StickerChip key={id} id={id} variant="already-owned" />
          ))}
        </div>

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

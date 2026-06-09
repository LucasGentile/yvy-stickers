'use client'

import { useState, useTransition } from 'react'
import { StickerChip } from './StickerChip'
import { createPurchaseRequest } from '@/actions/createPurchaseRequest'
import { useNotification } from '@/contexts/NotificationContext'

interface Props {
  buyerId: string
  seller: { userId: string; displayName: string; apartment: string; tower: string }
  stickerIds: string[]
  onClose: () => void
  onSuccess: () => void
}

export function PurchaseRequestModal({ buyerId, seller, stickerIds, onClose, onSuccess }: Props) {
  const { showSuccess, showError } = useNotification()
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await createPurchaseRequest(buyerId, {
        sellerId: seller.userId,
        stickerIds,
        message: message.trim() || undefined,
      })
      if (result.success) {
        showSuccess('Pedido enviado com sucesso!')
        onSuccess()
      } else {
        showError(result.error)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-yvy-surface rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <h3 className="text-base font-bold text-yvy-dark">Confirmar pedido</h3>

        <p className="text-sm text-yvy-muted">
          Solicitar{' '}
          <span className="font-semibold text-yvy-dark">
            {stickerIds.length} figurinha{stickerIds.length !== 1 ? 's' : ''}
          </span>{' '}
          para{' '}
          <span className="font-semibold text-yvy-dark">
            {seller.displayName} (apt {seller.apartment} – T{seller.tower})
          </span>
          :
        </p>

        <div className="flex flex-wrap gap-1">
          {stickerIds.map((id) => (
            <StickerChip key={id} id={id} variant="receiving" />
          ))}
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Mensagem opcional (ex: posso buscar no bloco)"
          rows={2}
          maxLength={200}
          disabled={isPending}
          className="w-full text-sm border border-yvy-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-yvy-accent bg-yvy-bg disabled:opacity-50"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl border border-yvy-border text-sm font-semibold text-yvy-muted hover:bg-yvy-bg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 py-2.5 rounded-xl bg-yvy-accent text-white text-sm font-semibold hover:bg-yvy-accent/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Enviando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

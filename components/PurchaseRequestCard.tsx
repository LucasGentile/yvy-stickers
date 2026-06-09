'use client'

import { useTransition } from 'react'
import { type PurchaseRequest } from '@/actions/getPurchaseRequests'
import { respondToPurchaseRequest } from '@/actions/respondToPurchaseRequest'
import { useNotification } from '@/contexts/NotificationContext'
import { StickerChip } from './StickerChip'

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  accepted: 'Aceito',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
}

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

interface Props {
  request: PurchaseRequest
  userId: string
  onDone: () => void
}

export function PurchaseRequestCard({ request, userId, onDone }: Props) {
  const { showSuccess, showError } = useNotification()
  const [isPending, startTransition] = useTransition()
  const isSeller = request.sellerId === userId

  function respond(action: 'accept' | 'reject' | 'cancel') {
    startTransition(async () => {
      const result = await respondToPurchaseRequest(userId, {
        requestId: request.id,
        action,
      })
      if (result.success) {
        const msg =
          action === 'accept'
            ? 'Pedido aceito! As figurinhas foram transferidas.'
            : action === 'reject'
              ? 'Pedido recusado.'
              : 'Pedido cancelado.'
        showSuccess(msg)
        onDone()
      } else {
        showError(result.error)
      }
    })
  }

  return (
    <div className="rounded-xl border border-yvy-border bg-yvy-surface p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {isSeller ? (
            <>
              <p className="text-xs text-yvy-muted">Pedido de compra de</p>
              <p className="text-sm font-bold text-yvy-dark">
                {request.buyerName}{' '}
                <span className="font-normal text-yvy-muted">
                  (apt {request.buyerApartment} – T{request.buyerTower})
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-yvy-muted">Pedido enviado para</p>
              <p className="text-sm font-bold text-yvy-dark">
                {request.sellerName}{' '}
                <span className="font-normal text-yvy-muted">
                  (apt {request.sellerApartment} – T{request.sellerTower})
                </span>
              </p>
            </>
          )}
        </div>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_CLASS[request.status] ?? ''}`}
        >
          {STATUS_LABEL[request.status] ?? request.status}
        </span>
      </div>

      {/* Sticker chips */}
      <div className="flex flex-wrap gap-1">
        {request.stickerIds.map((id) => (
          <StickerChip key={id} id={id} variant="receiving" />
        ))}
      </div>

      {/* Optional message */}
      {request.message && <p className="text-xs text-yvy-muted italic">"{request.message}"</p>}

      {/* Actions */}
      {request.status === 'pending' && (
        <div className="flex gap-2">
          {isSeller ? (
            <>
              <button
                onClick={() => respond('reject')}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg border border-yvy-border text-xs font-semibold text-yvy-muted hover:bg-yvy-bg transition-colors disabled:opacity-50"
              >
                Recusar
              </button>
              <button
                onClick={() => respond('accept')}
                disabled={isPending}
                className="flex-1 py-2 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:bg-yvy-accent/90 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Aceitando…' : 'Aceitar'}
              </button>
            </>
          ) : (
            <button
              onClick={() => respond('cancel')}
              disabled={isPending}
              className="py-2 px-4 rounded-lg border border-yvy-border text-xs font-semibold text-yvy-muted hover:bg-yvy-bg transition-colors disabled:opacity-50"
            >
              {isPending ? 'Cancelando…' : 'Cancelar pedido'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

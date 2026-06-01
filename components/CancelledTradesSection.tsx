'use client'

import { useTransition } from 'react'
import type { CancelledTrade } from '@/actions/getPendingTrades'
import { ackTradeCancellation } from '@/actions/ackTradeCancellation'
import { StickerList } from './trades/StickerList'
import { useNotification } from '@/contexts/NotificationContext'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CancelledTradeCard({
  trade,
  userId,
  onAck,
}: {
  trade: CancelledTrade
  userId: string
  onAck: () => void
}) {
  const isRejected = trade.status === 'rejected'
  const [pending, startTransition] = useTransition()
  const { showSuccess, showError } = useNotification()

  function handleAck() {
    startTransition(async () => {
      try {
        await ackTradeCancellation(trade.id, userId)
        showSuccess('Confirmado! Figurinha devolvida ao baralho.')
        onAck()
      } catch {
        showError('Erro ao confirmar. Tente novamente.')
      }
    })
  }

  return (
    <div
      className={`rounded-xl border p-3 space-y-2.5 ${
        isRejected ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{isRejected ? '🚫' : '↩️'}</span>
          <div>
            <p className={`text-xs font-bold ${isRejected ? 'text-rose-700' : 'text-amber-800'}`}>
              {isRejected ? 'Pedido recusado' : 'Troca cancelada'}
            </p>
            <p className="text-[11px] text-yvy-muted">
              Com {trade.otherUserName} · {formatDate(trade.createdAt)}
            </p>
          </div>
        </div>
        {trade.auditEntryId && (
          <a
            href={`/history/${trade.auditEntryId}`}
            className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
              isRejected
                ? 'bg-rose-100 border-rose-300 text-rose-700'
                : 'bg-amber-100 border-amber-300 text-amber-800'
            }`}
          >
            Ver detalhes
          </a>
        )}
      </div>

      <div
        className={`rounded-lg px-3 py-2 space-y-2 ${isRejected ? 'bg-rose-100/60' : 'bg-amber-100/60'}`}
      >
        <StickerList
          ids={trade.myGivingIds}
          label="Suas figurinhas — pegar de volta"
          variant="giving"
        />
        {trade.myReceivingIds.length > 0 && (
          <StickerList
            ids={trade.myReceivingIds}
            label="Figurinhas que você esperava receber"
            variant="receiving"
          />
        )}
      </div>

      <button
        onClick={handleAck}
        disabled={pending}
        className={`w-full text-xs font-semibold py-2 rounded-lg border transition-colors disabled:opacity-50 ${
          isRejected
            ? 'bg-rose-600 hover:bg-rose-700 border-rose-600 text-white'
            : 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white'
        }`}
      >
        {pending ? 'Confirmando…' : '✓ Entendi, devolvi a figurinha ao baralho'}
      </button>
    </div>
  )
}

export default function CancelledTradesSection({
  trades,
  userId,
  onAck,
}: {
  trades: CancelledTrade[]
  userId: string
  onAck: () => void
}) {
  if (trades.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
        <span>↩️</span>
        Trocas canceladas
        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-300">
          {trades.length}
        </span>
      </h3>
      <p className="text-xs text-yvy-muted leading-relaxed">
        Recupere as figurinhas separadas, devolva ao seu baralho e confirme abaixo.
      </p>
      <div className="space-y-2">
        {trades.map((t) => (
          <CancelledTradeCard key={t.id} trade={t} userId={userId} onAck={onAck} />
        ))}
      </div>
    </div>
  )
}

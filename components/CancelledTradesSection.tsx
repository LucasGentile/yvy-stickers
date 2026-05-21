'use client'

import type { CancelledTrade } from '@/actions/getPendingTrades'
import { StickerList } from './trades/StickerList'

function CancelledTradeCard({ trade }: { trade: CancelledTrade }) {
  const isRejected = trade.status === 'rejected'

  return (
    <div
      className={`rounded-xl border p-3 space-y-2.5 ${
        isRejected
          ? 'bg-rose-50 border-rose-200'
          : 'bg-amber-50 border-amber-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{isRejected ? '🚫' : '↩️'}</span>
          <div>
            <p
              className={`text-xs font-bold ${isRejected ? 'text-rose-700' : 'text-amber-800'}`}
            >
              {isRejected ? 'Pedido recusado' : 'Troca cancelada'}
            </p>
            <p className="text-[11px] text-yvy-muted">Com {trade.otherUserName}</p>
          </div>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
            isRejected
              ? 'bg-rose-100 border-rose-300 text-rose-700'
              : 'bg-amber-100 border-amber-300 text-amber-800'
          }`}
        >
          Devolver ao baralho
        </span>
      </div>

      <div
        className={`rounded-lg px-3 py-2 space-y-2 ${
          isRejected ? 'bg-rose-100/60' : 'bg-amber-100/60'
        }`}
      >
        <StickerList ids={trade.myGivingIds} label="Suas figurinhas — pegar de volta" variant="giving" />
        {trade.myReceivingIds.length > 0 && (
          <StickerList ids={trade.myReceivingIds} label="Figurinhas que você esperava receber" variant="receiving" />
        )}
      </div>
    </div>
  )
}

export default function CancelledTradesSection({ trades }: { trades: CancelledTrade[] }) {
  if (trades.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-bold text-yvy-dark">Trocas canceladas</h3>
        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {trades.length}
        </span>
      </div>
      <p className="text-xs text-yvy-muted leading-relaxed">
        Recupere as figurinhas separadas e devolva ao seu baralho de trocas.
      </p>
      <div className="space-y-2">
        {trades.map((t) => (
          <CancelledTradeCard key={t.id} trade={t} />
        ))}
      </div>
    </div>
  )
}

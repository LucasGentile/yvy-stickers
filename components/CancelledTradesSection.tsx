'use client'

import { useState } from 'react'
import type { CancelledTrade } from '@/actions/getPendingTrades'
import { StickerList } from './trades/StickerList'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function CancelledTradeCard({ trade }: { trade: CancelledTrade }) {
  const isRejected = trade.status === 'rejected'

  return (
    <a
      href={trade.auditEntryId ? `/history/${trade.auditEntryId}` : '/historico'}
      className={`block rounded-xl border p-3 space-y-2.5 transition-opacity hover:opacity-80 ${
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
        <span
          className={`shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
            isRejected
              ? 'bg-rose-100 border-rose-300 text-rose-700'
              : 'bg-amber-100 border-amber-300 text-amber-800'
          }`}
        >
          Devolver ao baralho
        </span>
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
    </a>
  )
}

export default function CancelledTradesSection({ trades }: { trades: CancelledTrade[] }) {
  const [expanded, setExpanded] = useState(false)

  if (trades.length === 0) return null

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span
          className="text-[10px] text-yvy-muted transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
        >
          ▶
        </span>
        <h3 className="text-base font-bold text-yvy-dark">Trocas canceladas</h3>
        <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {trades.length}
        </span>
      </button>

      {expanded && (
        <div className="space-y-2">
          <p className="text-xs text-yvy-muted leading-relaxed pl-4">
            Recupere as figurinhas separadas e devolva ao seu baralho de trocas.
          </p>
          <div className="space-y-2">
            {trades.map((t) => (
              <CancelledTradeCard key={t.id} trade={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

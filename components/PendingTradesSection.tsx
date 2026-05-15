'use client'

import { useState } from 'react'
import type { PendingTrade, RecentTrade } from '@/actions/getPendingTrades'
import { TradeCard } from './trades/TradeCard'
import { RecentTradeCard } from './trades/RecentTradeCard'

const COMPLETED_PAGE_SIZE = 3

interface Props {
  received: PendingTrade[]
  sent: PendingTrade[]
  recentlyAccepted?: RecentTrade[]
  userId: string
  onRefresh: () => void
}

export default function PendingTradesSection({
  received,
  sent,
  recentlyAccepted = [],
  userId,
  onRefresh,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)

  const total = received.length + sent.length
  const rollbackTrades = recentlyAccepted.filter((t) => t.rollbackRequestedBy !== null)
  const completedTrades = recentlyAccepted

  if (total === 0 && completedTrades.length === 0) return null

  const totalPages = Math.ceil(completedTrades.length / COMPLETED_PAGE_SIZE)
  const visibleCompleted = expanded
    ? completedTrades.slice(page * COMPLETED_PAGE_SIZE, (page + 1) * COMPLETED_PAGE_SIZE)
    : []

  return (
    <div className="space-y-3">
      {total > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-yvy-dark">Pedidos pendentes</h3>
            <span className="bg-yvy-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {total}
            </span>
          </div>

          {received.length > 0 && (
            <div className="space-y-2">
              {received.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}
            </div>
          )}

          {sent.length > 0 && (
            <div className="space-y-2">
              {sent.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}
            </div>
          )}
        </>
      )}

      {rollbackTrades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-bold text-yvy-dark">Desfazimentos pendentes</h3>
          {rollbackTrades.map((t) => (
            <RecentTradeCard key={`rb-${t.id}`} trade={t} userId={userId} onDone={onRefresh} />
          ))}
        </div>
      )}

      {completedTrades.length > 0 && (
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
            <h3 className="text-sm font-bold text-yvy-muted">
              Trocas concluídas ({completedTrades.length})
            </h3>
          </button>

          {expanded && (
            <div className="space-y-2">
              {visibleCompleted.map((t) => (
                <RecentTradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="text-xs text-yvy-muted disabled:opacity-30"
                  >
                    ← Anterior
                  </button>
                  <span className="text-[10px] text-yvy-muted">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="text-xs text-yvy-muted disabled:opacity-30"
                  >
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <hr className="border-yvy-border" />
    </div>
  )
}

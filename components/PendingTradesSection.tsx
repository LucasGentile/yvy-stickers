'use client'

import type { PendingTrade, RecentTrade } from '@/actions/getPendingTrades'
import { TradeCard } from './trades/TradeCard'
import { RecentTradeCard } from './trades/RecentTradeCard'

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
  const total = received.length + sent.length
  const rollbackTrades = recentlyAccepted.filter((t) => t.rollbackRequestedBy !== null)

  if (total === 0 && rollbackTrades.length === 0) return null

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
            <RecentTradeCard
              key={`rb-${t.id}`}
              trade={t}
              userId={userId}
              onDone={onRefresh}
              hideRollback
            />
          ))}
        </div>
      )}

      <hr className="border-yvy-border" />
    </div>
  )
}

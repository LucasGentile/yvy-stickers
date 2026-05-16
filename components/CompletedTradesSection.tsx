'use client'

import { useState } from 'react'
import type { RecentTrade } from '@/actions/getPendingTrades'
import { RecentTradeCard } from './trades/RecentTradeCard'

const PAGE_SIZE = 3

export function CompletedTradesSection({
  trades,
  userId,
  onRefresh,
}: {
  trades: RecentTrade[]
  userId: string
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const [onlyUnverified, setOnlyUnverified] = useState(false)

  if (trades.length === 0) return null

  const sorted = [...trades].sort(
    (a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
  )
  const filtered = onlyUnverified ? sorted.filter((t) => !t.verified) : sorted
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = expanded ? filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : []

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
        <h3 className="text-sm font-bold text-yvy-muted">Trocas concluídas ({trades.length})</h3>
      </button>

      {expanded && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer select-none pl-1">
            <input
              type="checkbox"
              checked={onlyUnverified}
              onChange={(e) => {
                setOnlyUnverified(e.target.checked)
                setPage(0)
              }}
              className="w-4.5 h-4.5 accent-yvy-accent"
            />
            <span className="text-xs text-yvy-muted font-medium">Apenas não verificadas</span>
          </label>

          {filtered.length === 0 ? (
            <p className="text-xs text-yvy-muted text-center py-3">
              Todas as trocas já foram verificadas.
            </p>
          ) : (
            <>
              {visible.map((t) => (
                <RecentTradeCard
                  key={t.id}
                  trade={t}
                  userId={userId}
                  onDone={onRefresh}
                  hideRollback
                />
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
            </>
          )}
        </div>
      )}
    </div>
  )
}

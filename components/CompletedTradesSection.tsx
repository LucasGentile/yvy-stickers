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
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [onlyUnverified, setOnlyUnverified] = useState(false)

  if (trades.length === 0) return null

  const partnerNames = [...new Set(trades.map((t) => t.otherUserName))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )

  let filtered = selectedPartner
    ? trades.filter((t) => t.otherUserName === selectedPartner)
    : trades

  if (onlyUnverified) {
    filtered = filtered.filter((t) => !t.verified)
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.acceptedAt).getTime() - new Date(a.acceptedAt).getTime()
  )

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const visible = expanded ? sorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE) : []

  function handlePartnerSelect(name: string) {
    setSelectedPartner((prev) => (prev === name ? null : name))
    setPage(0)
  }

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
        <h3 className="text-sm font-bold text-yvy-muted">
          Trocas concluídas ({trades.length})
          {selectedPartner && (
            <span className="font-normal text-xs ml-1">
              · {filtered.length} com {selectedPartner}
            </span>
          )}
        </h3>
      </button>

      {expanded && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {partnerNames.length > 1 && (
              <>
                {partnerNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => handlePartnerSelect(name)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      selectedPartner === name
                        ? 'bg-yvy-dark text-white'
                        : 'bg-yvy-bg text-yvy-muted border border-yvy-border hover:border-yvy-dark hover:text-yvy-dark'
                    }`}
                  >
                    {name}
                  </button>
                ))}
                <span className="w-px h-4 bg-yvy-border mx-1" />
              </>
            )}
            <button
              onClick={() => {
                setOnlyUnverified((v) => !v)
                setPage(0)
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                onlyUnverified
                  ? 'bg-amber-500 text-white'
                  : 'bg-yvy-bg text-amber-700 border border-amber-300 hover:border-amber-500'
              }`}
            >
              Apenas não verificadas
            </button>
          </div>

          {sorted.length === 0 ? (
            <p className="text-xs text-yvy-muted text-center py-4">
              {onlyUnverified
                ? 'Todas as trocas já foram verificadas.'
                : `Nenhuma troca concluída com ${selectedPartner}.`}
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
                    disabled={safePage === 0}
                    className="text-xs text-yvy-muted disabled:opacity-30"
                  >
                    ← Anterior
                  </button>
                  <span className="text-[10px] text-yvy-muted">
                    {safePage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage === totalPages - 1}
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

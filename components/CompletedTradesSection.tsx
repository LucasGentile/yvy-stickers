'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RecentTrade } from '@/actions/getPendingTrades'
import { getAdvancedTrades, AdvancedTradeView } from '@/actions/getAdvancedTrades'
import { RecentTradeCard } from './trades/RecentTradeCard'
import { StickerChip } from './StickerChip'

const PAGE_SIZE = 3

type CompletedAdvancedTrade = AdvancedTradeView & { type: 'advanced' }
type CompletedNormalTrade = RecentTrade & { type: 'normal' }
type CompletedTrade = CompletedAdvancedTrade | CompletedNormalTrade

function AdvancedTradeCard({ trade }: { trade: CompletedAdvancedTrade }) {
  return (
    <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-purple-700">Troca triangular</span>
        <span className="text-[10px] text-yvy-muted ml-auto">
          {new Date(trade.acceptedAt ?? trade.createdAt).toLocaleDateString('pt-BR')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-yvy-muted font-semibold uppercase tracking-wide mb-1">Você deu →</p>
          <div className="flex flex-wrap gap-1">
            {trade.myGivingIds.map((id) => (
              <StickerChip key={id} id={id} variant="giving" />
            ))}
          </div>
        </div>
        <div>
          <p className="text-yvy-muted font-semibold uppercase tracking-wide mb-1">← Você recebeu</p>
          <div className="flex flex-wrap gap-1">
            {trade.myReceivingIds.map((id) => (
              <StickerChip key={id} id={id} variant="receiving" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-purple-600">
        Com {trade.giveTo.name} e {trade.receiveFrom.name}
      </p>
    </div>
  )
}

function getPartnerNames(trades: RecentTrade[], advancedTrades: AdvancedTradeView[]) {
  const names = new Set<string>()
  for (const t of trades) names.add(t.otherUserName)
  for (const t of advancedTrades) {
    names.add(t.giveTo.name)
    names.add(t.receiveFrom.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function tradeInvolvesPartner(trade: CompletedTrade, partner: string) {
  if (trade.type === 'normal') return trade.otherUserName === partner
  return trade.giveTo.name === partner || trade.receiveFrom.name === partner
}

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
  const [advancedTrades, setAdvancedTrades] = useState<AdvancedTradeView[]>([])

  const loadAdvanced = useCallback(async () => {
    const all = await getAdvancedTrades(userId)
    setAdvancedTrades(all.filter((t) => t.status === 'accepted'))
  }, [userId])

  useEffect(() => {
    loadAdvanced()
  }, [loadAdvanced])

  const allCompleted: CompletedTrade[] = [
    ...trades.map((t) => ({ ...t, type: 'normal' as const })),
    ...advancedTrades.map((t) => ({ ...t, type: 'advanced' as const })),
  ]

  const totalCount = allCompleted.length
  if (totalCount === 0) return null

  const partnerNames = getPartnerNames(trades, advancedTrades)

  const filtered = selectedPartner
    ? allCompleted.filter((t) => tradeInvolvesPartner(t, selectedPartner))
    : allCompleted

  const sorted = [...filtered].sort((a, b) => {
    const dateA = a.type === 'normal' ? a.acceptedAt : (a.acceptedAt ?? a.createdAt)
    const dateB = b.type === 'normal' ? b.acceptedAt : (b.acceptedAt ?? b.createdAt)
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

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
          Trocas concluídas ({totalCount})
          {selectedPartner && (
            <span className="font-normal text-xs ml-1">
              · {filtered.length} com {selectedPartner}
            </span>
          )}
        </h3>
      </button>

      {expanded && (
        <div className="space-y-3">
          {partnerNames.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
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
            </div>
          )}

          {sorted.length === 0 ? (
            <p className="text-xs text-yvy-muted text-center py-4">
              Nenhuma troca concluída com {selectedPartner}.
            </p>
          ) : (
            <>
              {visible.map((t) =>
                t.type === 'normal' ? (
                  <RecentTradeCard
                    key={t.id}
                    trade={t}
                    userId={userId}
                    onDone={() => {
                      onRefresh()
                      loadAdvanced()
                    }}
                    hideRollback
                  />
                ) : (
                  <AdvancedTradeCard key={t.id} trade={t} />
                )
              )}

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

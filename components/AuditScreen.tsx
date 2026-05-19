'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useEffect, useState } from 'react'
import { getAuditLog, type AuditEntry } from '@/actions/getAuditLog'
import { getTradeLog } from '@/actions/getTradeLog'
import { EventCard } from './audit/EventCard'
import { groupByDay, consolidateActivity, EVENT_CONFIG } from './audit/eventConfig'
import { Pagination } from './Pagination'

const TRADE_PAGE_SIZE = 3
const ACTIVITY_PAGE_SIZE = 10

export default function AuditScreen() {
  const [tradeEntries, setTradeEntries] = useState<AuditEntry[]>([])
  const [activityEntries, setActivityEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tradePage, setTradePage] = useState(0)
  const [activityPage, setActivityPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [stickerSearch, setStickerSearch] = useState('')

  useEffect(() => {
    const uid = localStorage.getItem('userId') ?? ''
    setUserId(uid)
    if (!uid) {
      setLoading(false)
      return
    }
    Promise.all([getTradeLog(uid), getAuditLog(uid).catch(() => [] as AuditEntry[])])
      .then(([trades, activity]) => {
        setTradeEntries(trades)
        setActivityEntries(consolidateActivity(activity))
      })
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <LoadingScreen />
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>Você precisa se identificar primeiro.</p>
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>{error}</p>
      </div>
    )
  }

  const searchTerm = stickerSearch.trim().toUpperCase()
  const filteredTradeEntries = searchTerm
    ? tradeEntries.filter((e) => {
        const giving = (e.metadata.givingIds as string[] | undefined) ?? []
        const receiving = (e.metadata.receivingIds as string[] | undefined) ?? []
        const thirdParty = (e.metadata.thirdPartyIds as string[] | undefined) ?? []
        return [...giving, ...receiving, ...thirdParty].some((id) =>
          id.toUpperCase().includes(searchTerm)
        )
      })
    : tradeEntries

  const tradeTotalPages = Math.max(1, Math.ceil(filteredTradeEntries.length / TRADE_PAGE_SIZE))
  const tradePageEntries = filteredTradeEntries.slice(
    tradePage * TRADE_PAGE_SIZE,
    tradePage * TRADE_PAGE_SIZE + TRADE_PAGE_SIZE
  )

  const activityTotalPages = Math.max(1, Math.ceil(activityEntries.length / ACTIVITY_PAGE_SIZE))
  const activityPageEntries = activityEntries.slice(
    activityPage * ACTIVITY_PAGE_SIZE,
    activityPage * ACTIVITY_PAGE_SIZE + ACTIVITY_PAGE_SIZE
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
        Histórico
      </h2>

      {/* ── Trocas ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-yvy-dark uppercase tracking-wide">Trocas</h3>
          {tradeEntries.length > 0 && (
            <span className="text-xs text-yvy-muted">
              {filteredTradeEntries.length === tradeEntries.length
                ? `${tradeEntries.length} registro${tradeEntries.length !== 1 ? 's' : ''}`
                : `${filteredTradeEntries.length} de ${tradeEntries.length}`}
            </span>
          )}
        </div>

        {tradeEntries.length > 0 && (
          <input
            type="text"
            placeholder="Buscar figurinha (ex: NED17)"
            value={stickerSearch}
            onChange={(e) => {
              setStickerSearch(e.target.value)
              setTradePage(0)
            }}
            className="w-full px-3 py-2 text-sm rounded-lg border border-yvy-border bg-yvy-surface text-yvy-text placeholder:text-yvy-muted/50 focus:outline-none focus:border-yvy-accent"
          />
        )}

        {filteredTradeEntries.length === 0 ? (
          <div className="text-center py-8 text-yvy-muted bg-yvy-bg rounded-xl border border-yvy-border">
            <p className="text-sm">
              {searchTerm
                ? `Nenhuma troca encontrada com "${stickerSearch.trim()}".`
                : 'Nenhuma troca registrada ainda.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {groupByDay(tradePageEntries).map(({ day, entries: dayEntries }) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted">
                      {day}
                    </span>
                    <div className="flex-1 h-px bg-yvy-border" />
                  </div>
                  <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md px-4 py-3 space-y-4">
                    {dayEntries.map((entry) => (
                      <EventCard key={entry.id} entry={entry} userId={userId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Pagination page={tradePage} totalPages={tradeTotalPages} onPageChange={setTradePage} />
          </>
        )}
      </div>

      {/* ── Atividade ────────────────────────────────────────────────── */}
      {activityEntries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted/70">
            Atividade
          </h3>

          <div className="space-y-4">
            {groupByDay(activityPageEntries).map(({ day, entries: dayEntries }) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted/60">
                    {day}
                  </span>
                  <div className="flex-1 h-px bg-yvy-border/60" />
                </div>
                <div className="bg-yvy-bg rounded-xl border border-yvy-border px-4 py-2.5 space-y-2 divide-y divide-yvy-border/50">
                  {dayEntries
                    .filter((e) => EVENT_CONFIG[e.action])
                    .map((entry) => (
                      <div key={entry.id} className="pt-2 first:pt-0">
                        <EventCard entry={entry} userId={userId} />
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <Pagination
            page={activityPage}
            totalPages={activityTotalPages}
            onPageChange={setActivityPage}
          />
        </div>
      )}
    </div>
  )
}

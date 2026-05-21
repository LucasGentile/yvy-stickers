'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { getMatches, MatchResult } from '@/lib/matching'
import { getPendingTrades, PendingTrade } from '@/actions/getPendingTrades'
import MatchCard from './MatchCard'
import PendingTradesSection from './PendingTradesSection'
import CancelledTradesSection from './CancelledTradesSection'
import { CompletedTradesSection } from './CompletedTradesSection'
import { ColorLegend } from './trades/ColorLegend'

function CollapsibleMatchSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

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
        <h3 className="text-sm font-bold text-yvy-muted">{title}</h3>
      </button>

      {expanded && (
        <div className="space-y-3">
          <p className="text-xs text-yvy-muted leading-relaxed pl-4">{description}</p>
          {children}
        </div>
      )}
    </div>
  )
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [pending, setPending] = useState<{
    received: PendingTrade[]
    sent: PendingTrade[]
    recentlyAccepted: import('@/actions/getPendingTrades').RecentTrade[]
    recentlyCancelled: import('@/actions/getPendingTrades').CancelledTrade[]
  }>({
    received: [],
    sent: [],
    recentlyAccepted: [],
    recentlyCancelled: [],
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshMatches = useCallback(async (uid: string) => {
    setRefreshing(true)
    try {
      const [fresh, freshPending] = await Promise.all([getMatches(uid), getPendingTrades(uid)])
      setMatches(fresh)
      setPending(freshPending)
      window.dispatchEvent(new Event('trade-action'))
    } catch {
      /* silently ignore refresh errors */
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (!uid) {
      setError('Você precisa se identificar primeiro.')
      setLoading(false)
      return
    }
    setUserId(uid)
    getMatches(uid)
      .then(setMatches)
      .catch(() => setError('Erro ao buscar trocas. Tente novamente.'))
      .finally(() => setLoading(false))

    getPendingTrades(uid)
      .then(setPending)
      .catch(() => {
        /* pending trades failing silently — matches still show */
      })

    // Refresh full match list when the tab regains focus — another user may have
    // completed a trade while this user was away, making some stickers stale.
    const handleVisibility = () => {
      if (!document.hidden) refreshMatches(uid)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refreshMatches])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>{error}</p>
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  const pendingCount = pending.received.length + pending.sent.length

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
            Ranking de Trocas
          </h2>
          {pendingCount > 0 && (
            <span className="bg-yvy-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <button
          onClick={() => userId && refreshMatches(userId)}
          disabled={refreshing}
          aria-label="Atualizar ranking"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-yvy-border bg-yvy-surface text-yvy-muted hover:text-yvy-dark hover:border-yvy-dark transition-colors disabled:opacity-40"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          >
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {userId &&
        (() => {
          const rollbackTrades = pending.recentlyAccepted.filter(
            (t) => t.rollbackRequestedBy !== null
          )
          const hasPending = pending.received.length > 0 || pending.sent.length > 0
          if (!hasPending && rollbackTrades.length === 0) return null
          return (
            <PendingTradesSection
              received={pending.received}
              sent={pending.sent}
              recentlyAccepted={rollbackTrades}
              userId={userId}
              onRefresh={() => refreshMatches(userId)}
            />
          )
        })()}

      {pending.recentlyCancelled.length > 0 && (
        <CancelledTradesSection trades={pending.recentlyCancelled} />
      )}

      <ColorLegend />

      {matches.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted">
          <p className="text-base">Nenhum participante ainda.</p>
          <p className="text-sm mt-1">Aguarde mais moradores se cadastrarem.</p>
        </div>
      ) : (
        <>
          {(() => {
            const NEAR_COMPLETE_THRESHOLD = 85
            const nearCompleteMatches = matches
              .filter((m) => m.completionPct >= NEAR_COMPLETE_THRESHOLD && m.mutualScore >= 1)
              .sort((a, b) => {
                if (b.completionPct !== a.completionPct) return b.completionPct - a.completionPct
                return b.reciprocalScore - a.reciprocalScore
              })
            const nearCompleteIds = new Set(nearCompleteMatches.map((m) => m.userId))
            const regularMatches = matches.filter(
              (m) => !nearCompleteIds.has(m.userId) || m.mutualScore >= 5
            )

            return (
              <>
                {nearCompleteMatches.length > 0 && (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-amber-600 flex items-center gap-1.5">
                        🎯 Ajude a completar o álbum
                      </h3>
                      <p className="text-xs text-yvy-muted leading-relaxed">
                        Estes participantes estão quase completando o álbum e têm pelo menos uma
                        figurinha para trocar com você. Uma pequena troca pode fazer a diferença!
                      </p>
                    </div>
                    <div className="space-y-3">
                      {nearCompleteMatches.map((m, i) => (
                        <MatchCard
                          key={`nc-${m.userId}`}
                          match={m}
                          rank={i + 1}
                          nearComplete
                          onTradeCreated={() => userId && refreshMatches(userId)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {(() => {
                  const mutualMatches = regularMatches.filter(
                    (m) => m.matchScore > 0 && m.reciprocalScore > 0
                  )
                  const theyHaveForMe = regularMatches.filter(
                    (m) => m.matchScore > 0 && m.reciprocalScore === 0
                  )
                  const iHaveForThem = regularMatches.filter(
                    (m) => m.reciprocalScore > 0 && m.matchScore === 0
                  )

                  return (
                    <>
                      {mutualMatches.length > 0 && (
                        <>
                          {nearCompleteMatches.length > 0 && (
                            <h3 className="text-sm font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5">
                              Ranking de Compatibilidade
                            </h3>
                          )}
                          <div className="bg-yvy-bg rounded-xl border border-yvy-border px-4 py-3 text-xs text-yvy-muted leading-relaxed">
                            Quem aparece primeiro é quem mais tem figurinhas para trocar{' '}
                            <strong className="text-yvy-dark">com você</strong>, e você com ele/ela
                            ao mesmo tempo. Toque em{' '}
                            <strong className="text-yvy-dark">Realizar Troca</strong> para enviar um
                            pedido.
                          </div>
                          <div className="space-y-3">
                            {mutualMatches.map((m, i) => (
                              <MatchCard
                                key={m.userId}
                                match={m}
                                rank={i + 1}
                                onTradeCreated={() => userId && refreshMatches(userId)}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {theyHaveForMe.length > 0 && (
                        <CollapsibleMatchSection
                          title={`Têm para mim, mas não precisa das minhas (${theyHaveForMe.length})`}
                          description="Estes moradores têm figurinhas que você precisa, mas você não tem nenhuma repetida que eles precisam no momento."
                        >
                          {theyHaveForMe.map((m, i) => (
                            <MatchCard
                              key={m.userId}
                              match={m}
                              rank={i + 1}
                              onTradeCreated={() => userId && refreshMatches(userId)}
                            />
                          ))}
                        </CollapsibleMatchSection>
                      )}

                      {iHaveForThem.length > 0 && (
                        <CollapsibleMatchSection
                          title={`Precisa das minhas, mas não têm para mim (${iHaveForThem.length})`}
                          description="Você tem repetidas que estes moradores precisam, mas eles não têm nenhuma figurinha que você precisa no momento."
                        >
                          {iHaveForThem.map((m, i) => (
                            <MatchCard
                              key={m.userId}
                              match={m}
                              rank={i + 1}
                              onTradeCreated={() => userId && refreshMatches(userId)}
                            />
                          ))}
                        </CollapsibleMatchSection>
                      )}
                    </>
                  )
                })()}
              </>
            )
          })()}
        </>
      )}

      {userId && pending.recentlyAccepted.length > 0 && (
        <CompletedTradesSection
          trades={pending.recentlyAccepted}
          userId={userId}
          onRefresh={() => refreshMatches(userId)}
        />
      )}
    </div>
  )
}

'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useEffect, useState, useCallback } from 'react'
import { getRanking, RankedUser } from '@/actions/getRanking'

const MEDAL = [
  {
    border: 'border-yvy-gold border-2',
    banner: 'bg-yvy-gold',
    bar: 'bg-yvy-gold',
    label: 'bg-yvy-gold text-white',
  },
  {
    border: 'border-[#9ca3af] border-2',
    banner: 'bg-[#9ca3af]',
    bar: 'bg-[#9ca3af]',
    label: 'bg-[#9ca3af] text-white',
  },
  {
    border: 'border-[#b45309] border-2',
    banner: 'bg-[#b45309]',
    bar: 'bg-[#b45309]',
    label: 'bg-[#b45309] text-white',
  },
]

const MEDAL_LABEL = ['🥇 Ouro', '🥈 Prata', '🥉 Bronze']

function RankCard({ user, rank }: { user: RankedUser; rank: number }) {
  const medal = rank <= 3 ? MEDAL[rank - 1] : null
  const isTop3 = rank <= 3

  return (
    <div
      className={`bg-yvy-surface rounded-xl shadow-md overflow-hidden flex flex-col gap-0 ${
        isTop3 ? medal!.border : 'border border-yvy-gold/20'
      }`}
    >
      {/* Top 3 banner */}
      {isTop3 && (
        <div className={`flex items-center gap-2 px-4 py-1.5 ${medal!.banner}`}>
          <span className="text-white text-[11px] font-bold uppercase tracking-widest">
            {MEDAL_LABEL[rank - 1]}
          </span>
        </div>
      )}

      <div className="px-4 py-3 flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center gap-2.5">
          <span
            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
              isTop3
                ? `${medal!.label} border-0`
                : 'bg-yvy-bg text-yvy-muted border border-yvy-border'
            }`}
          >
            {rank}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-yvy-dark text-sm capitalize truncate">{user.name}</p>
            <p className="text-xs text-yvy-muted">
              Apto {user.apartment.toUpperCase()} · Torre {user.tower}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`text-lg font-bold leading-none ${
                rank === 1
                  ? 'text-yvy-gold'
                  : rank === 2
                    ? 'text-[#9ca3af]'
                    : rank === 3
                      ? 'text-[#b45309]'
                      : 'text-yvy-dark'
              }`}
            >
              {user.completionPct}%
            </p>
            <p className="text-[10px] text-yvy-gold/60 mt-0.5">
              {user.ownedCount}/{user.totalCount}
            </p>
            {user.albumCompletedAt && (
              <p className="text-[9px] text-emerald-600 mt-0.5">
                Completo em{' '}
                {new Date(user.albumCompletedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-yvy-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isTop3 ? medal!.bar : 'bg-yvy-accent'
            }`}
            style={{ width: `${user.completionPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export default function RankingScreen() {
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback((opts?: { silent?: boolean }) => {
    if (opts?.silent) setRefreshing(true)
    return getRanking()
      .then(setRanking)
      .catch(() => {
        if (!opts?.silent) setError('Erro ao carregar o ranking. Tente novamente.')
      })
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    load()
    let lastFetch = Date.now()
    const handleVisibility = () => {
      if (!document.hidden && Date.now() - lastFetch > 30_000) {
        lastFetch = Date.now()
        load({ silent: true })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [load])

  if (loading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Ranking do Álbum
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-yvy-muted">{ranking.length} participantes</p>
          <button
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            aria-label="Atualizar"
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
      </div>

      {ranking.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted">
          <p>Nenhum participante ainda.</p>
        </div>
      ) : (
        <>
          {(() => {
            const completed = ranking.filter((u) => u.completionPct === 100)
            const inProgress = ranking.filter((u) => u.completionPct < 100)

            return (
              <>
                {completed.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                      Álbuns completos
                    </h3>
                    {completed.map((user, i) => (
                      <RankCard key={user.id} user={user} rank={i + 1} />
                    ))}
                  </div>
                )}

                {inProgress.length > 0 && (
                  <div className="space-y-2">
                    {completed.length > 0 && (
                      <h3 className="text-sm font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 mt-4">
                        Em progresso
                      </h3>
                    )}
                    {inProgress.map((user, i) => (
                      <RankCard key={user.id} user={user} rank={i + 1} />
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}
    </div>
  )
}

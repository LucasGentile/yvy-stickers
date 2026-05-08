'use client'

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
        isTop3 ? medal!.border : 'border border-yvy-border'
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

      <div className={`px-4 py-3 flex flex-col gap-2 ${isTop3 ? '' : ''}`}>
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
            <p className="text-[10px] text-yvy-muted mt-0.5">
              {user.ownedCount}/{user.totalCount}
            </p>
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
      .catch(() => { if (!opts?.silent) setError('Erro ao carregar o ranking. Tente novamente.') })
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => {
    load()
    const handleVisibility = () => { if (!document.hidden) load({ silent: true }) }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [load])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando ranking...</p>
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Ranking do Álbum
        </h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-yvy-muted">{ranking.length} participantes</p>
          <button
            onClick={() => load({ silent: true })}
            disabled={refreshing}
            className="text-xs text-yvy-accent underline disabled:opacity-40"
          >
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </div>

      {ranking.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted">
          <p>Nenhum participante ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ranking.map((user, i) => (
            <RankCard key={user.id} user={user} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

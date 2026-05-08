'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMatches, MatchResult } from '@/lib/matching'
import { getPendingTrades, PendingTrade } from '@/actions/getPendingTrades'
import MatchCard from './MatchCard'
import PendingTradesSection from './PendingTradesSection'

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [pending, setPending] = useState<{ received: PendingTrade[]; sent: PendingTrade[] }>({ received: [], sent: [] })
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPending = useCallback(async (uid: string) => {
    const result = await getPendingTrades(uid)
    setPending(result)
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
      .catch(() => {/* pending trades failing silently — matches still show */})
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Buscando trocas...</p>
      </div>
    )
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
          <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">Ranking de Trocas</h2>
          {pendingCount > 0 && (
            <span className="bg-yvy-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
        <a href="/stickers" className="text-sm text-yvy-accent underline">
          Atualizar figurinhas
        </a>
      </div>

      {userId && (pending.received.length > 0 || pending.sent.length > 0) && (
        <PendingTradesSection
          received={pending.received}
          sent={pending.sent}
          userId={userId}
          onRefresh={() => loadPending(userId)}
        />
      )}

      {matches.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted">
          <p className="text-base">Nenhum participante ainda.</p>
          <p className="text-sm mt-1">Aguarde mais moradores se cadastrarem.</p>
        </div>
      ) : (
        <>
          <div className="bg-yvy-bg rounded-xl border border-yvy-border px-4 py-3 text-xs text-yvy-muted leading-relaxed">
            Ranking de compatibilidade — quem aparece primeiro é quem mais tem figurinhas para
            trocar <strong className="text-yvy-dark">com você</strong>, e você com ele/ela ao mesmo
            tempo. Toque em <strong className="text-yvy-dark">Realizar Troca</strong> para enviar um
            pedido de troca.
          </div>

          <div className="space-y-3">
            {matches.map((m, i) => (
              <MatchCard key={m.userId} match={m} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { getMatches, MatchResult } from '@/lib/matching'
import MatchCard from './MatchCard'

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) {
      setError('Você precisa se identificar primeiro.')
      setLoading(false)
      return
    }
    getMatches(userId)
      .then(setMatches)
      .catch(() => setError('Erro ao buscar trocas. Tente novamente.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <p>Buscando trocas...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>{error}</p>
        <a href="/" className="text-green-600 underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Melhores trocas</h2>
        <a href="/stickers" className="text-sm text-green-600 underline">
          Atualizar minhas figurinhas
        </a>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base">Nenhuma troca disponível no momento.</p>
          <p className="text-sm mt-1">Tente novamente quando mais moradores se cadastrarem.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <MatchCard key={m.userId} match={m} />
          ))}
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { getPanelinhas, Panelinha } from '@/actions/getPanelinhas'

// ─── Tier config ──────────────────────────────────────────────────────────────

type Tier = {
  icon: string
  label: string
  description: string
  cardBg: string
  cardBorder: string
  labelColor: string
  countColor: string
}

function getTier(count: number): Tier {
  if (count >= 5)
    return {
      icon: '🏆',
      label: 'Inseparáveis',
      description: 'Já viraram referência de parceria no condomínio',
      cardBg: 'bg-red-50',
      cardBorder: 'border-red-300',
      labelColor: 'text-red-600',
      countColor: 'text-red-500',
    }
  if (count >= 3)
    return {
      icon: '⭐',
      label: 'Dupla de elite',
      description: 'Essa dupla não para de trocar',
      cardBg: 'bg-pink-50',
      cardBorder: 'border-pink-300',
      labelColor: 'text-pink-600',
      countColor: 'text-pink-500',
    }
  if (count === 2)
    return {
      icon: '🤝',
      label: 'Dupla dinâmica',
      description: 'A parceria tá crescendo',
      cardBg: 'bg-amber-50',
      cardBorder: 'border-amber-300',
      labelColor: 'text-amber-600',
      countColor: 'text-amber-500',
    }
  return {
    icon: '🌱',
    label: 'Primeiros passos',
    description: 'Começou com uma trocinha...',
    cardBg: 'bg-purple-50',
    cardBorder: 'border-purple-200',
    labelColor: 'text-purple-600',
    countColor: 'text-purple-500',
  }
}

// ─── Rank badge ───────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="text-2xl" title="1º lugar">
        🥇
      </span>
    )
  if (rank === 2)
    return (
      <span className="text-2xl" title="2º lugar">
        🥈
      </span>
    )
  if (rank === 3)
    return (
      <span className="text-2xl" title="3º lugar">
        🥉
      </span>
    )
  return (
    <span className="text-sm font-bold text-yvy-muted w-8 text-center">#{rank}</span>
  )
}

// ─── Pair card ────────────────────────────────────────────────────────────────

function PairCard({ pair }: { pair: Panelinha }) {
  const tier = getTier(pair.tradeCount)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border ${tier.cardBg} ${tier.cardBorder} px-4 py-3 shadow-sm`}
    >
      {/* Rank */}
      <div className="shrink-0 w-8 flex justify-center">
        <RankBadge rank={pair.rank} />
      </div>

      {/* Names + tier */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-yvy-dark truncate">
          {pair.user1Name}{' '}
          <span className="font-normal text-yvy-muted">&</span>{' '}
          {pair.user2Name}
        </p>
        <p className={`text-xs font-semibold ${tier.labelColor} mt-0.5`}>
          {tier.icon} {tier.label}
        </p>
        <p className="text-[11px] text-yvy-muted leading-snug mt-0.5 italic">
          {tier.description}
        </p>
      </div>

      {/* Trade count */}
      <div className="shrink-0 text-right">
        <p className={`text-xl font-bold leading-none ${tier.countColor}`}>
          {pair.tradeCount}
        </p>
        <p className="text-[10px] text-yvy-muted mt-0.5">
          {pair.tradeCount === 1 ? 'troca' : 'trocas'}
        </p>
      </div>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PanelinhasScreen() {
  const [pairs, setPairs] = useState<Panelinha[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPanelinhas()
      .then(setPairs)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Calculando panelinhas...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Panelinhas do YVYs
        </h2>
        <p className="text-xs text-yvy-muted mt-1 pl-2.5">
          Os pares que mais trocam figurinhas entre si 🤝
        </p>
      </div>

      {/* Info banner */}
      <div className="bg-pink-50 border border-pink-200 rounded-xl px-4 py-3">
        <p className="text-xs text-pink-800 leading-relaxed">
          Ranking dos pares que mais realizaram trocas entre si. Quanto mais trocas, mais
          inseparáveis — e mais suspeitos de panelinha!
        </p>
      </div>

      {pairs.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted space-y-2">
          <p className="text-base">Nenhuma troca realizada ainda.</p>
          <p className="text-sm">As panelinhas aparecem conforme as trocas forem concluídas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pairs.map((p) => (
            <PairCard key={`${p.user1Name}-${p.user2Name}`} pair={p} />
          ))}
        </div>
      )}
    </div>
  )
}

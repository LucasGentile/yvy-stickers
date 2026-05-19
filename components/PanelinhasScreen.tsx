'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useEffect, useState, useCallback } from 'react'
import { getPanelinhas, Panelinha } from '@/actions/getPanelinhas'

// ─── Tier config ──────────────────────────────────────────────────────────────

type Tier = {
  icon: string
  label: string
  descriptions: string[]
  cardBg: string
  cardBorder: string
  labelColor: string
  countColor: string
}

const TIERS: { minCount: number; tier: Tier }[] = [
  {
    minCount: 5,
    tier: {
      icon: '🏆',
      label: 'Inseparáveis',
      descriptions: [
        'Já viraram referência de parceria no condomínio',
        'Se um comprar um pacote, o outro já sabe o que veio',
        'O álbum de um é quase extensão do outro',
        'Essa dupla devia ter um álbum compartilhado',
        'Ninguém sabe onde um termina e o outro começa',
      ],
      cardBg: 'bg-amber-50',
      cardBorder: 'border-amber-400',
      labelColor: 'text-amber-700',
      countColor: 'text-amber-600',
    },
  },
  {
    minCount: 3,
    tier: {
      icon: '⭐',
      label: 'Dupla de elite',
      descriptions: [
        'Essa dupla não para de trocar',
        'Parceria que já virou rotina no condomínio',
        'Já trocaram mais vezes que o Wi-Fi do prédio cai',
        'Confia um no outro mais que no pacote de figurinhas',
        'O síndico já suspeita de alguma coisa',
      ],
      cardBg: 'bg-orange-50',
      cardBorder: 'border-orange-300',
      labelColor: 'text-orange-600',
      countColor: 'text-orange-500',
    },
  },
  {
    minCount: 2,
    tier: {
      icon: '🤝',
      label: 'Dupla dinâmica',
      descriptions: [
        'A parceria tá crescendo',
        'Segundo encontro confirmado',
        'Dois pedidos já é relacionamento sério',
        'Começou bem — vamos ver se vai pra frente',
        'Já passaram da fase de apresentação',
      ],
      cardBg: 'bg-teal-50',
      cardBorder: 'border-teal-300',
      labelColor: 'text-teal-700',
      countColor: 'text-teal-600',
    },
  },
  {
    minCount: 1,
    tier: {
      icon: '🌱',
      label: 'Primeiros passos',
      descriptions: [
        'Começou com uma troquinha inocente...',
        'Uma troca, uma amizade que pode durar até o fim do campeonato',
        'Todo grande álbum começa com uma figurinha',
        'Primeiro passo dado — o resto é com eles',
        'Ainda estão se conhecendo pelo álbum',
      ],
      cardBg: 'bg-blue-50',
      cardBorder: 'border-blue-200',
      labelColor: 'text-blue-600',
      countColor: 'text-blue-500',
    },
  },
]

function getTier(count: number, index: number): Tier & { description: string } {
  const tier = (TIERS.find((t) => count >= t.minCount) ?? TIERS[TIERS.length - 1]).tier
  const description = tier.descriptions[index % tier.descriptions.length]
  return { ...tier, description }
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
  return <span className="text-sm font-bold text-yvy-muted w-8 text-center">#{rank}</span>
}

// ─── Pair card ────────────────────────────────────────────────────────────────

function PairCard({ pair }: { pair: Panelinha }) {
  const tier = getTier(pair.tradeCount, pair.rank - 1)

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
          {pair.user1Name} <span className="font-normal text-yvy-muted">&</span> {pair.user2Name}
        </p>
        <p className={`text-xs font-semibold ${tier.labelColor} mt-0.5`}>
          {tier.icon} {tier.label}
        </p>
        <p className="text-[11px] text-yvy-muted leading-snug mt-0.5 italic">{tier.description}</p>
      </div>

      {/* Trade count */}
      <div className="shrink-0 text-right">
        <p className={`text-xl font-bold leading-none ${tier.countColor}`}>{pair.tradeCount}</p>
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
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getPanelinhas()
      setPairs(data)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    const handleVisibility = () => {
      if (!document.hidden) load(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [load])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
            Panelinhas do YVYs
          </h2>
          <p className="text-xs text-yvy-muted mt-1 pl-2.5">
            Os pares que mais trocam figurinhas entre si 🤝
          </p>
        </div>
        <button
          onClick={() => load(true)}
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

      {/* Info banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-900 leading-relaxed">
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

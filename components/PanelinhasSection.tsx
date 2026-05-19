'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPanelinhas, Panelinha } from '@/actions/getPanelinhas'

const PAGE_SIZE = 5

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

function PairCard({ pair }: { pair: Panelinha }) {
  const tier = getTier(pair.tradeCount, pair.rank - 1)

  return (
    <div
      className={`flex items-center gap-3 rounded-xl border ${tier.cardBg} ${tier.cardBorder} px-4 py-3 shadow-sm`}
    >
      <div className="shrink-0 w-8 flex justify-center">
        <RankBadge rank={pair.rank} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-yvy-dark truncate">
          {pair.user1Name} <span className="font-normal text-yvy-muted">&</span> {pair.user2Name}
        </p>
        <p className={`text-xs font-semibold ${tier.labelColor} mt-0.5`}>
          {tier.icon} {tier.label}
        </p>
        <p className="text-[11px] text-yvy-muted leading-snug mt-0.5 italic">{tier.description}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className={`text-xl font-bold leading-none ${tier.countColor}`}>{pair.tradeCount}</p>
        <p className="text-[10px] text-yvy-muted mt-0.5">
          {pair.tradeCount === 1 ? 'troca' : 'trocas'}
        </p>
      </div>
    </div>
  )
}

export default function PanelinhasSection() {
  const [pairs, setPairs] = useState<Panelinha[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPanelinhas()
      setPairs(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="text-center py-8 text-yvy-muted">
        <p className="text-sm">Calculando panelinhas...</p>
      </div>
    )
  }

  if (pairs.length === 0) {
    return (
      <div className="text-center py-8 text-yvy-muted space-y-1">
        <p className="text-sm">Nenhuma troca realizada ainda.</p>
        <p className="text-xs">As panelinhas aparecem conforme as trocas forem concluídas.</p>
      </div>
    )
  }

  const visiblePairs = pairs.slice(0, visibleCount)
  const hasMore = visibleCount < pairs.length

  return (
    <div className="space-y-2">
      {visiblePairs.map((p) => (
        <PairCard key={`${p.user1Name}-${p.user2Name}`} pair={p} />
      ))}
      {hasMore && (
        <button
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full py-2.5 text-sm font-medium text-yvy-accent hover:text-yvy-gold transition-colors rounded-xl border border-yvy-gold/20 bg-yvy-surface"
        >
          Ver mais ({pairs.length - visibleCount} restantes)
        </button>
      )}
    </div>
  )
}

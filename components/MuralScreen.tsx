'use client'

import { useEffect, useState, useCallback } from 'react'
import { getMuralInsights, Insight } from '@/actions/getMuralInsights'
import PanelinhasSection from '@/components/PanelinhasSection'

const COLOR_MAP: Record<
  Insight['color'],
  { card: string; border: string; title: string; emoji: string }
> = {
  red: { card: 'bg-red-50', border: 'border-red-200', title: 'text-red-700', emoji: 'bg-red-100' },
  orange: {
    card: 'bg-orange-50',
    border: 'border-orange-200',
    title: 'text-orange-700',
    emoji: 'bg-orange-100',
  },
  amber: {
    card: 'bg-amber-50',
    border: 'border-amber-200',
    title: 'text-amber-700',
    emoji: 'bg-amber-100',
  },
  green: {
    card: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-green-700',
    emoji: 'bg-green-100',
  },
  blue: {
    card: 'bg-blue-50',
    border: 'border-blue-200',
    title: 'text-blue-700',
    emoji: 'bg-blue-100',
  },
  purple: {
    card: 'bg-purple-50',
    border: 'border-purple-200',
    title: 'text-purple-700',
    emoji: 'bg-purple-100',
  },
  pink: {
    card: 'bg-pink-50',
    border: 'border-pink-200',
    title: 'text-pink-700',
    emoji: 'bg-pink-100',
  },
  teal: {
    card: 'bg-teal-50',
    border: 'border-teal-200',
    title: 'text-teal-700',
    emoji: 'bg-teal-100',
  },
}

function InsightCard({ insight }: { insight: Insight }) {
  const c = COLOR_MAP[insight.color]
  return (
    <div className={`rounded-2xl border ${c.card} ${c.border} p-4 shadow-sm space-y-2`}>
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-full ${c.emoji} flex items-center justify-center text-xl`}
        >
          {insight.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-bold uppercase tracking-widest ${c.title} mb-0.5`}>
            {insight.title}
          </p>
          <p className="text-sm font-bold text-yvy-dark leading-snug">{insight.highlight}</p>
        </div>
      </div>
      <p className="text-xs text-yvy-muted leading-relaxed pl-[52px] italic">{insight.detail}</p>
    </div>
  )
}

export default function MuralScreen() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const data = await getMuralInsights()
      setInsights(data)
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
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Garimpando fatos constrangedores...</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
            Mural do YVY
          </h2>
          <p className="text-xs text-yvy-muted mt-0.5 pl-2.5">
            Fatos e insights do condomínio figurinheiro
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="text-sm text-yvy-accent underline disabled:opacity-40"
        >
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Disclaimer banner */}
      <div className="bg-yvy-surface border border-yvy-border rounded-xl px-4 py-3">
        <p className="text-xs text-yvy-muted leading-relaxed">
          <span className="font-semibold text-yvy-dark">Aviso importante:</span> os fatos abaixo são
          gerados automaticamente com fins humorísticos. Se você apareceu aqui é porque se destacou
          — de alguma forma. 😬
        </p>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted space-y-2">
          <p className="text-base">Sem dados suficientes ainda.</p>
          <p className="text-sm">Volte quando o condomínio tiver mais figurinhas coladas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}

      <p className="text-center text-[10px] text-yvy-muted pt-2">
        Atualizado com base nos dados mais recentes · Sem julgamentos (mentira)
      </p>

      {/* Panelinhas section */}
      <div className="border-t border-yvy-border pt-6 mt-6 space-y-3">
        <div>
          <h3 className="text-base font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
            Panelinhas do YVYs
          </h3>
          <p className="text-xs text-yvy-muted mt-0.5 pl-2.5">
            Os pares que mais trocam figurinhas entre si 🤝
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-900 leading-relaxed">
            Ranking dos pares que mais realizaram trocas entre si. Quanto mais trocas, mais
            inseparáveis — e mais suspeitos de panelinha!
          </p>
        </div>

        <PanelinhasSection />
      </div>
    </div>
  )
}

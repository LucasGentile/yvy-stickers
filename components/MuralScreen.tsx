'use client'

import { useEffect, useState, useCallback } from 'react'
import { getMuralInsights, Insight } from '@/actions/getMuralInsights'
import PanelinhasSection from '@/components/PanelinhasSection'
import RankingScreen from '@/components/RankingScreen'
import { useMuralTab, MURAL_TABS } from '@/contexts/MuralTabContext'

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
  const { tab } = useMuralTab()
  const [insights, setInsights] = useState<Insight[]>([])
  const [muralLoading, setMuralLoading] = useState(false)
  const [muralLoaded, setMuralLoaded] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadMural = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setMuralLoading(true)
    try {
      const data = await getMuralInsights()
      setInsights(data)
      setMuralLoaded(true)
    } finally {
      setMuralLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'mural' && !muralLoaded && !muralLoading) {
      loadMural()
    }
  }, [tab, muralLoaded, muralLoading, loadMural])

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && tab === 'mural' && muralLoaded) loadMural(true)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [tab, muralLoaded, loadMural])

  return (
    <div className="flex flex-col flex-1">
      {/* Invisible spacer — matches the tab bar rendered inside <header> */}
      <div aria-hidden="true" className="invisible shrink-0">
        <div className="max-w-lg mx-auto px-3 py-2 flex gap-1">
          {MURAL_TABS.map((t) => (
            <button key={t.id} className="flex-1 py-2 rounded-lg text-sm font-semibold">
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ranking tab */}
      {tab === 'ranking' && <RankingScreen />}

      {/* Mural tab */}
      {tab === 'mural' && (
        <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
                Mural do YVY
              </h2>
              <p className="text-xs text-yvy-muted mt-0.5 pl-2.5">
                Fatos e insights do condomínio figurinheiro
              </p>
            </div>
            <button
              onClick={() => loadMural(true)}
              disabled={refreshing || muralLoading}
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

          {muralLoading && !muralLoaded ? (
            <div className="flex justify-center py-16">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-yvy-gold/70 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-yvy-surface border border-yvy-gold/20 rounded-xl px-4 py-3">
                <p className="text-xs text-yvy-muted leading-relaxed">
                  <span className="font-semibold text-yvy-dark">Aviso importante:</span> os fatos
                  abaixo são gerados automaticamente com fins humorísticos. Se você apareceu aqui é
                  porque se destacou — de alguma forma. 😬
                </p>
              </div>

              {insights.length === 0 ? (
                <div className="text-center py-16 text-yvy-muted space-y-2">
                  <p className="text-base">Sem dados suficientes ainda.</p>
                  <p className="text-sm">
                    Volte quando o condomínio tiver mais figurinhas coladas.
                  </p>
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
            </>
          )}
        </div>
      )}

      {/* Panelinhas tab */}
      {tab === 'panelinhas' && (
        <div className="max-w-lg mx-auto w-full px-4 py-6 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
              Panelinhas do YVYs
            </h2>
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
      )}
    </div>
  )
}

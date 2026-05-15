'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTradeTimeline, type TradeTimeline } from '@/actions/getTradeTimeline'
import { TimelineEntry } from './audit/TimelineEntry'

export default function TradeTimelineScreen({ entryId }: { entryId: string }) {
  const [timeline, setTimeline] = useState<TradeTimeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const uid = localStorage.getItem('userId') ?? ''
    if (!uid) {
      setError('Você precisa se identificar primeiro.')
      setLoading(false)
      return
    }
    getTradeTimeline(entryId, uid)
      .then((data) => {
        if (!data || data.entries.length === 0) {
          setError('Evento não encontrado ou não faz parte de uma troca.')
        } else {
          setTimeline(data)
        }
      })
      .catch(() => setError('Erro ao carregar timeline.'))
      .finally(() => setLoading(false))
  }, [entryId])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando timeline...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 text-center">
        <p className="text-yvy-muted">{error}</p>
        <Link href="/historico" className="text-yvy-accent underline mt-3 inline-block text-sm">
          ← Voltar ao histórico
        </Link>
      </div>
    )
  }

  if (!timeline) return null

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/historico" className="text-yvy-accent text-sm hover:underline shrink-0">
          ← Histórico
        </Link>
        <h2 className="text-lg font-bold text-yvy-dark [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Timeline da troca
        </h2>
      </div>

      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md px-4 py-3">
        <div className="relative">
          <div className="absolute left-[18px] top-3 bottom-3 w-px bg-yvy-border" />

          <div className="space-y-0">
            {timeline.entries.map((entry) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                isFocused={entry.id === timeline.focusedEntryId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

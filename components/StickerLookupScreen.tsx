'use client'

import { useState } from 'react'
import { checkStickerAvailability, StickerAvailabilityResult } from '@/actions/checkStickerAvailability'
import { isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

function ResultCard({ stickerId, result }: { stickerId: string; result: StickerAvailabilityResult }) {
  const isChrome = isChromeSticker(stickerId)
  const isCoke = isCocaColaSticker(stickerId)
  const idStyle = isChrome ? 'text-amber-500' : isCoke ? 'text-red-500' : 'text-yvy-dark'

  if (result.status === 'invalid') {
    return (
      <div className="rounded-xl border border-yvy-border bg-yvy-surface p-4 space-y-1">
        <p className="font-mono font-bold text-yvy-dark">{stickerId}</p>
        <p className="text-sm text-red-500">Código inválido. Verifique e tente novamente.</p>
      </div>
    )
  }

  if (result.status === 'not_owned') {
    return (
      <div className="rounded-xl border border-yvy-border bg-yvy-surface p-4 flex items-center gap-4">
        <span className="text-3xl shrink-0">❌</span>
        <div>
          <p className={`font-mono font-bold ${idStyle}`}>{stickerId}</p>
          <p className="text-sm font-semibold text-yvy-dark mt-0.5">Não disponível</p>
          <p className="text-xs text-yvy-muted">Você não tem esta figurinha.</p>
        </div>
      </div>
    )
  }

  if (result.status === 'no_dupes') {
    return (
      <div className="rounded-xl border border-yvy-border bg-yvy-surface p-4 flex items-center gap-4">
        <span className="text-3xl shrink-0">📖</span>
        <div>
          <p className={`font-mono font-bold ${idStyle}`}>{stickerId}</p>
          <p className="text-sm font-semibold text-yvy-dark mt-0.5">Não disponível</p>
          <p className="text-xs text-yvy-muted">Colada no álbum, sem repetidas.</p>
        </div>
      </div>
    )
  }

  const config = {
    available: {
      icon: '✅',
      headline: 'Disponível para troca',
      headlineColor: 'text-green-700',
      border: 'border-green-200',
      bg: 'bg-green-50',
    },
    partial: {
      icon: '⚠️',
      headline: 'Parcialmente disponível',
      headlineColor: 'text-amber-700',
      border: 'border-amber-200',
      bg: 'bg-amber-50',
    },
    fully_reserved: {
      icon: '🔒',
      headline: 'Reservada — indisponível',
      headlineColor: 'text-red-600',
      border: 'border-red-200',
      bg: 'bg-red-50',
    },
  }[result.status]

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4 space-y-3`}>
      {/* Primary answer */}
      <div className="flex items-center gap-3">
        <span className="text-3xl shrink-0">{config.icon}</span>
        <div>
          <p className={`font-mono font-bold ${idStyle}`}>{stickerId}</p>
          <p className={`text-sm font-bold mt-0.5 ${config.headlineColor}`}>{config.headline}</p>
        </div>
      </div>

      {/* Secondary counts */}
      <div className="flex gap-3 text-center">
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p className="text-lg font-bold text-yvy-dark">{result.dupeCount}</p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Repetidas</p>
        </div>
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p className={`text-lg font-bold ${result.reservedCount > 0 ? 'text-amber-600' : 'text-yvy-muted'}`}>
            {result.reservedCount}
          </p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Reservadas</p>
        </div>
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p className={`text-lg font-bold ${result.availableCount > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {result.availableCount}
          </p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Livres</p>
        </div>
      </div>

      {/* Trades locking this sticker */}
      {result.pendingTrades.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-yvy-muted">
            Reservada em {result.pendingTrades.length} troca{result.pendingTrades.length !== 1 ? 's' : ''} ativa{result.pendingTrades.length !== 1 ? 's' : ''}
          </p>
          {result.pendingTrades.map((t) => (
            <p key={t.tradeId} className="text-[12px] text-yvy-text">
              <span className="text-amber-500 mr-1.5">·</span>
              <span className="capitalize font-medium">{t.partnerName}</span>
              <span className="text-yvy-muted ml-1">(aguardando resposta)</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StickerLookupScreen() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<StickerAvailabilityResult | null>(null)
  const [displayId, setDisplayId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    const userId = localStorage.getItem('userId') ?? ''
    if (!userId) return

    setLoading(true)
    setResult(null)
    try {
      const normalized = q.toUpperCase()
      setDisplayId(normalized === '00' ? 'FWC00' : normalized)
      setResult(await checkStickerAvailability(userId, q))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Verificar Figurinha
        </h2>
        <p className="text-xs text-yvy-muted mt-1 pl-3">
          Consulte se uma figurinha está disponível para troca fora do app — sem conflitar com trocas já ativas.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSearch() }} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setResult(null) }}
          placeholder="Ex: BRA5, FWC00, MEX12..."
          autoCapitalize="characters"
          className="flex-1 rounded-lg border border-yvy-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg uppercase placeholder:normal-case"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Verificar'}
        </button>
      </form>

      {result && <ResultCard stickerId={displayId} result={result} />}

      {!result && (
        <p className="text-[11px] text-yvy-muted text-center leading-relaxed">
          Digite o código da figurinha — ex: <span className="font-mono">BRA5</span>, <span className="font-mono">FWC00</span>, <span className="font-mono">MEX12</span>
        </p>
      )}
    </div>
  )
}

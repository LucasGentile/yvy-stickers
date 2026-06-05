'use client'

import { useState, useRef, useEffect } from 'react'
import {
  checkStickerAvailability,
  StickerAvailabilityResult,
} from '@/actions/checkStickerAvailability'
import {
  checkStickerListAvailability,
  type BulkStickerResult,
} from '@/actions/checkStickerListAvailability'
import {
  isChromeSticker,
  isCocaColaSticker,
  ALL_TEAMS,
  ALL_STICKER_SECTIONS,
  type StickerSpecial,
} from '@/lib/stickers'
import { CountryFlag } from '@/components/CountryFlag'

// ─── Browse entries ───────────────────────────────────────────────────────────

type BrowseEntry =
  | { kind: 'team'; code: string; name: string; flagCode: string; stickers: string[] }
  | { kind: 'special'; label: string; icon: string; stickers: string[] }

const FWC_STICKERS = ALL_STICKER_SECTIONS.filter(
  (s): s is StickerSpecial => s.type === 'special' && s.label !== 'Figurinhas Coca-Cola'
).flatMap((s) => s.stickers)

const CC_STICKERS =
  ALL_STICKER_SECTIONS.find(
    (s): s is StickerSpecial => s.type === 'special' && s.label === 'Figurinhas Coca-Cola'
  )?.stickers ?? []

const BROWSE_ENTRIES: BrowseEntry[] = [
  { kind: 'special', label: 'Copa do Mundo (FWC)', icon: '⚽', stickers: FWC_STICKERS },
  { kind: 'special', label: 'Coca-Cola (CC)', icon: '🥤', stickers: CC_STICKERS },
  ...ALL_TEAMS.map((t) => ({
    kind: 'team' as const,
    code: t.code,
    name: t.name,
    flagCode: t.flagCode,
    stickers: t.stickers,
  })),
]

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  stickerId,
  result,
}: {
  stickerId: string
  result: StickerAvailabilityResult
}) {
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
      <div className="flex items-center gap-3">
        <span className="text-3xl shrink-0">{config.icon}</span>
        <div>
          <p className={`font-mono font-bold ${idStyle}`}>{stickerId}</p>
          <p className={`text-sm font-bold mt-0.5 ${config.headlineColor}`}>{config.headline}</p>
        </div>
      </div>

      <div className="flex gap-3 text-center">
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p className="text-lg font-bold text-yvy-dark">{result.dupeCount}</p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Repetidas</p>
        </div>
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p
            className={`text-lg font-bold ${result.reservedCount > 0 ? 'text-amber-600' : 'text-yvy-muted'}`}
          >
            {result.reservedCount}
          </p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Reservadas</p>
        </div>
        <div className="flex-1 bg-white/60 rounded-lg py-2">
          <p
            className={`text-lg font-bold ${result.availableCount > 0 ? 'text-green-600' : 'text-red-500'}`}
          >
            {result.availableCount}
          </p>
          <p className="text-[10px] text-yvy-muted uppercase tracking-wide">Livres</p>
        </div>
      </div>

      {result.pendingTrades.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-yvy-muted">
            Reservada em {result.pendingTrades.length} troca
            {result.pendingTrades.length !== 1 ? 's' : ''} ativa
            {result.pendingTrades.length !== 1 ? 's' : ''}
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

// ─── Bulk results ─────────────────────────────────────────────────────────────

const BULK_GROUPS = [
  {
    status: 'available' as const,
    label: 'Tenho para trocar',
    icon: '✅',
    chipBg: 'bg-green-100 border-green-300',
    defaultText: 'text-green-800',
  },
  {
    status: 'partial' as const,
    label: 'Tenho, parcialmente reservada',
    icon: '⚠️',
    chipBg: 'bg-amber-100 border-amber-300',
    defaultText: 'text-amber-800',
  },
  {
    status: 'fully_reserved' as const,
    label: 'Tenho, mas totalmente reservada',
    icon: '🔒',
    chipBg: 'bg-red-50 border-red-200',
    defaultText: 'text-red-600',
  },
  {
    status: 'no_dupes' as const,
    label: 'Colada, sem repetidas',
    icon: '📖',
    chipBg: 'bg-sky-50 border-sky-200',
    defaultText: 'text-sky-700',
  },
  {
    status: 'not_owned' as const,
    label: 'Não tenho',
    icon: '❌',
    chipBg: 'bg-yvy-bg border-yvy-border',
    defaultText: 'text-yvy-muted',
  },
  {
    status: 'invalid' as const,
    label: 'Código inválido',
    icon: '·',
    chipBg: 'bg-yvy-bg border-yvy-border/30',
    defaultText: 'text-yvy-border/40 line-through',
  },
]

function BulkResults({ results }: { results: BulkStickerResult[] }) {
  const canGive = results.filter((r) => r.status === 'available' || r.status === 'partial').length
  const haveOnly = results.filter(
    (r) => r.status === 'no_dupes' || r.status === 'fully_reserved'
  ).length
  const dontHave = results.filter((r) => r.status === 'not_owned').length
  const valid = results.filter((r) => r.status !== 'invalid').length

  return (
    <div className="space-y-4">
      <div className="bg-yvy-surface rounded-xl border border-yvy-border px-4 py-3">
        <p className="text-xs font-semibold text-yvy-dark mb-1">
          {valid} figurinha{valid !== 1 ? 's' : ''} verificada{valid !== 1 ? 's' : ''}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
          {canGive > 0 && <span className="text-green-700 font-medium">{canGive} para trocar</span>}
          {haveOnly > 0 && (
            <span className="text-sky-700">
              {haveOnly} colada{haveOnly !== 1 ? 's' : ''} sem repetidas
            </span>
          )}
          {dontHave > 0 && <span className="text-red-600">{dontHave} não tenho</span>}
        </div>
      </div>

      {BULK_GROUPS.map(({ status, label, icon, chipBg, defaultText }) => {
        const items = results.filter((r) => r.status === status)
        if (!items.length) return null
        return (
          <div key={status} className="space-y-1.5">
            <p className="text-[11px] font-semibold text-yvy-muted uppercase tracking-wide">
              {icon} {label} <span className="font-normal">({items.length})</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((r) => {
                const chrome = isChromeSticker(r.stickerId)
                const coke = isCocaColaSticker(r.stickerId)
                const textClass = chrome ? 'text-amber-500' : coke ? 'text-red-500' : defaultText
                return (
                  <span
                    key={r.stickerId}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${chipBg}`}
                  >
                    <span className={textClass}>{r.stickerId}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function StickerLookupScreen() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<StickerAvailabilityResult | null>(null)
  const [bulkResults, setBulkResults] = useState<BulkStickerResult[] | null>(null)
  const [displayId, setDisplayId] = useState('')
  const [loading, setLoading] = useState(false)

  const [browseQuery, setBrowseQuery] = useState('')
  const [browseOpen, setBrowseOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<BrowseEntry | null>(null)
  const browseRef = useRef<HTMLDivElement>(null)

  const filteredBrowse = browseQuery.trim()
    ? BROWSE_ENTRIES.filter((e) => {
        const q = browseQuery.toLowerCase()
        if (e.kind === 'team')
          return e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
        return e.label.toLowerCase().includes(q)
      })
    : BROWSE_ENTRIES

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function runCheck(code: string) {
    const userId = localStorage.getItem('userId') ?? ''
    if (!userId) return

    const tokens = code
      .split(/[;,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)

    if (tokens.length > 1) {
      setDisplayId('')
      setResult(null)
      setBulkResults(null)
      setLoading(true)
      try {
        setBulkResults(await checkStickerListAvailability(userId, tokens))
      } finally {
        setLoading(false)
      }
      return
    }

    setBulkResults(null)
    const normalized = code.toUpperCase()
    const finalId = normalized === '00' ? 'FWC00' : normalized
    setDisplayId(finalId)
    setQuery(finalId)
    setLoading(true)
    setResult(null)
    try {
      setResult(await checkStickerAvailability(userId, code))
    } finally {
      setLoading(false)
    }
  }

  function selectEntry(entry: BrowseEntry) {
    setSelectedEntry(entry)
    setBrowseOpen(false)
    setBrowseQuery('')
    setResult(null)
    setDisplayId('')
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Verificar Figurinha
        </h2>
        <p className="text-xs text-yvy-muted mt-1 pl-3 leading-relaxed">
          Consulte uma figurinha pelo código — ou cole uma lista (ex: do botão "Copiar lista" em
          Faltantes) para ver de uma vez quais você tem para trocar.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-yvy-bg rounded-xl border border-yvy-border px-4 py-3 space-y-1.5 text-xs text-yvy-muted leading-snug">
        <div className="flex items-start gap-2">
          <span className="shrink-0">💬</span>
          <span>
            Alguém te pediu uma figurinha no WhatsApp ou pessoalmente? Verifique aqui antes de
            prometer.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0">📊</span>
          <span>
            O resultado mostra total de repetidas, quantas estão reservadas em trocas ativas e
            quantas estão livres para oferecer.
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="shrink-0">🗺️</span>
          <span>
            Não sabe o código? Use o buscador abaixo para navegar por seleção e tocar direto na
            figurinha.
          </span>
        </div>
      </div>

      {/* Direct code input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          runCheck(query.trim())
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setResult(null)
            setBulkResults(null)
          }}
          placeholder="Ex: BRA5 · ou cole uma lista: BRA1;MEX3;ARG5..."
          autoCapitalize="characters"
          className="flex-1 rounded-lg border border-yvy-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg uppercase placeholder:normal-case"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : 'Verificar'}
        </button>
      </form>

      {/* Browse by section */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-yvy-border" />
          <span className="text-[10px] uppercase tracking-widest text-yvy-muted/70 font-semibold whitespace-nowrap">
            ou navegue por seleção
          </span>
          <div className="flex-1 h-px bg-yvy-border" />
        </div>

        {/* Searchable section picker */}
        <div ref={browseRef} className="relative">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-sm pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              value={browseQuery}
              onChange={(e) => {
                setBrowseQuery(e.target.value)
                setBrowseOpen(true)
                if (selectedEntry) setSelectedEntry(null)
              }}
              onFocus={() => setBrowseOpen(true)}
              placeholder={
                selectedEntry
                  ? selectedEntry.kind === 'team'
                    ? `${selectedEntry.name} (${selectedEntry.code})`
                    : selectedEntry.label
                  : 'Buscar seleção ou coleção...'
              }
              className={`w-full rounded-lg border border-yvy-border pl-8 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg ${
                selectedEntry && !browseQuery
                  ? 'placeholder:text-yvy-dark placeholder:font-medium'
                  : ''
              }`}
            />
            {(browseQuery || selectedEntry) && (
              <button
                type="button"
                onClick={() => {
                  setBrowseQuery('')
                  setSelectedEntry(null)
                  setBrowseOpen(false)
                  setResult(null)
                  setDisplayId('')
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {browseOpen && (
            <div className="absolute z-40 mt-1 w-full bg-yvy-surface border border-yvy-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredBrowse.length === 0 ? (
                <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum resultado</p>
              ) : (
                filteredBrowse.map((entry) => (
                  <button
                    key={entry.kind === 'team' ? entry.code : entry.label}
                    type="button"
                    onClick={() => selectEntry(entry)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-yvy-bg transition-colors"
                  >
                    {entry.kind === 'team' ? (
                      <CountryFlag code={entry.flagCode} name={entry.name} size="sm" />
                    ) : (
                      <span className="w-5 text-center text-base shrink-0">{entry.icon}</span>
                    )}
                    <span className="text-yvy-text flex-1 text-left">
                      {entry.kind === 'team' ? entry.name : entry.label}
                    </span>
                    {entry.kind === 'team' && (
                      <span className="text-yvy-muted font-mono text-xs">{entry.code}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sticker chips for selected section */}
        {selectedEntry && (
          <div className="bg-yvy-surface rounded-xl border border-yvy-gold/20 p-3 space-y-2">
            <div className="flex items-center gap-2">
              {selectedEntry.kind === 'team' ? (
                <CountryFlag code={selectedEntry.flagCode} name={selectedEntry.name} size="sm" />
              ) : (
                <span className="text-base">{selectedEntry.icon}</span>
              )}
              <p className="text-xs font-semibold text-yvy-dark">
                {selectedEntry.kind === 'team' ? selectedEntry.name : selectedEntry.label}
                <span className="font-normal text-yvy-muted ml-1">— toque para verificar</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {selectedEntry.stickers.map((id) => {
                const chrome = isChromeSticker(id)
                const coke = isCocaColaSticker(id)
                const isActive = displayId === id && result !== null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => runCheck(id)}
                    disabled={loading}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors disabled:opacity-50 ${
                      isActive
                        ? 'bg-yvy-gold border-yvy-gold text-yvy-dark'
                        : 'bg-yvy-bg border-yvy-border text-yvy-text hover:border-yvy-accent'
                    }`}
                  >
                    {chrome ? (
                      <span className={isActive ? 'text-amber-300' : 'text-amber-500'}>{id}</span>
                    ) : coke ? (
                      <span className={isActive ? 'text-red-300' : 'text-red-500'}>{id}</span>
                    ) : (
                      id
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {result && <ResultCard stickerId={displayId} result={result} />}

      {bulkResults && <BulkResults results={bulkResults} />}

      {!result && !bulkResults && !selectedEntry && (
        <p className="text-xs text-yvy-text/70 text-center leading-relaxed">
          Digite o código da figurinha — ex: <span className="font-mono">BRA5</span>,{' '}
          <span className="font-mono">FWC00</span>, <span className="font-mono">MEX12</span>
        </p>
      )}
    </div>
  )
}

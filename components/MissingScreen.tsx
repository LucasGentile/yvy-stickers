'use client'
import LoadingScreen from '@/components/LoadingScreen'
import { CountryFlag } from '@/components/CountryFlag'

import { useState, useEffect, useRef } from 'react'
import { getUserData } from '@/actions/getUserData'
import {
  ALL_STICKER_IDS,
  ALL_STICKER_SECTIONS,
  StickerGroup,
  isChromeSticker,
  isCocaColaSticker,
} from '@/lib/stickers'
import { normalizeSearch } from '@/lib/format'

export default function MissingScreen() {
  const [missingSet, setMissingSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) {
      setLoading(false)
      return
    }
    getUserData(id).then((data) => {
      if (data) {
        const marked = new Set(data.stickerIds)
        const list =
          data.inputMode === 'have'
            ? ALL_STICKER_IDS.filter((id) => !marked.has(id))
            : ALL_STICKER_IDS.filter((id) => marked.has(id))
        setMissingSet(new Set(list))
      }
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Build searchable list of sections/teams that have at least one missing sticker
  type SearchOption = { id: string; label: string; sub: string; flagCode?: string; icon?: string }
  const allOptions: SearchOption[] = ALL_STICKER_SECTIONS.flatMap<SearchOption>((section) => {
    if (section.type === 'group') {
      return (section as StickerGroup).teams
        .filter((t) => t.stickers.some((id) => missingSet.has(id)))
        .map(
          (t): SearchOption => ({
            id: `missing-${t.code}`,
            label: t.name,
            sub: t.code,
            flagCode: t.flagCode,
          })
        )
    }
    if (!section.stickers.some((id) => missingSet.has(id))) return []
    const prefix = section.stickers[0].replace(/\d+$/, '')
    return [
      {
        id: `missing-section-${section.label}`,
        label: section.label,
        sub: prefix,
        icon: section.icon,
      },
    ]
  })

  const q = normalizeSearch(query.trim())
  const filteredOptions = q
    ? allOptions.filter(
        (o) => normalizeSearch(o.label).includes(q) || normalizeSearch(o.sub).includes(q)
      )
    : allOptions

  function goTo(id: string) {
    setQuery('')
    setOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCopy() {
    navigator.clipboard.writeText([...missingSet].join(';')).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    const text = 'Figurinhas faltantes:\n' + [...missingSet].join('\n')
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'faltantes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>Você precisa se identificar primeiro.</p>
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  if (missingSet.size === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
        <div>
          <p className="text-xl font-bold text-yvy-dark">Álbum completo! 🏆</p>
          <p className="text-sm text-yvy-muted mt-1">Você não tem nenhuma figurinha faltando.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Figurinhas Faltantes: <span className="text-yvy-accent">{missingSet.size}</span>
        </h2>
        <a href="/stickers" className="text-xs text-yvy-muted underline">
          ← Minhas Figurinhas
        </a>
      </div>

      {/* Country/section search with dropdown */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Ir para um país ou coleção..."
            className="w-full rounded-lg border border-yvy-border pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-surface"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setOpen(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {open && (
          <div className="absolute z-40 mt-1 w-full bg-yvy-surface border border-yvy-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum resultado</p>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => goTo(opt.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-yvy-bg transition-colors"
                >
                  {opt.flagCode ? (
                    <CountryFlag code={opt.flagCode} name={opt.label} size="sm" />
                  ) : (
                    <span className="text-base shrink-0">{opt.icon}</span>
                  )}
                  <span className="text-yvy-text">{opt.label}</span>
                  <span className="text-yvy-muted font-mono text-xs ml-auto">{opt.sub}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="space-y-8">
        {ALL_STICKER_SECTIONS.map((section) => {
          if (section.type === 'group') {
            const teamsWithMissing = (section as StickerGroup).teams.filter((t) =>
              t.stickers.some((id) => missingSet.has(id))
            )
            if (teamsWithMissing.length === 0) return null
            return (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-yvy-gold/30">
                  <span className="text-lg">🌍</span>
                  <span className="text-sm font-bold text-yvy-dark uppercase tracking-wide">
                    {section.label}
                  </span>
                </div>
                <div className="space-y-4">
                  {teamsWithMissing.map((team) => (
                    <div key={team.code} id={`missing-${team.code}`} className="scroll-mt-20">
                      <div className="flex items-center gap-2 mb-1.5">
                        <CountryFlag code={team.flagCode} name={team.name} size="md" />
                        <span className="text-xs font-semibold text-yvy-text truncate">
                          {team.name}
                        </span>
                        <span className="text-[10px] text-yvy-muted font-mono shrink-0">
                          {team.code}
                        </span>
                        <span className="ml-auto text-[10px] font-semibold text-yvy-muted shrink-0">
                          {team.stickers.filter((id) => missingSet.has(id)).length} faltando
                        </span>
                      </div>
                      <div className="grid grid-cols-10 gap-1">
                        {team.stickers.map((id, idx) => {
                          const missing = missingSet.has(id)
                          return (
                            <span
                              key={id}
                              className={`relative aspect-[4.9/6.5] w-full rounded-[2px] text-xs font-semibold flex items-center justify-center ${
                                missing
                                  ? 'bg-amber-50 text-amber-800 ring-2 ring-inset ring-amber-300'
                                  : 'bg-yvy-bg text-yvy-border/40 ring-2 ring-inset ring-yvy-border/30'
                              }`}
                            >
                              {isChromeSticker(id) ? (
                                <span
                                  className={`font-bold ${missing ? 'text-amber-500' : 'text-yvy-border/30'}`}
                                >
                                  {idx + 1}
                                </span>
                              ) : (
                                idx + 1
                              )}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          } else {
            const sectionMissing = section.stickers.filter((id) => missingSet.has(id))
            if (sectionMissing.length === 0) return null
            return (
              <div
                key={section.label}
                id={`missing-section-${section.label}`}
                className="scroll-mt-20"
              >
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-yvy-gold/30">
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-sm font-bold text-yvy-dark uppercase tracking-wide">
                    {section.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {section.stickers.map((id) => {
                    const missing = missingSet.has(id)
                    return (
                      <span
                        key={id}
                        className={`h-10 px-2 rounded-[2px] text-xs font-semibold flex items-center ring-2 ring-inset ${
                          missing
                            ? 'bg-amber-50 text-amber-800 ring-amber-300'
                            : 'bg-yvy-bg text-yvy-border/40 ring-yvy-border/30'
                        }`}
                      >
                        {isChromeSticker(id) ? (
                          <span
                            className={`font-bold ${missing ? 'text-amber-500' : 'text-yvy-border/30'}`}
                          >
                            {id}
                          </span>
                        ) : isCocaColaSticker(id) ? (
                          <span
                            className={`font-bold ${missing ? 'text-red-500' : 'text-yvy-border/30'}`}
                          >
                            {id}
                          </span>
                        ) : (
                          id
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          }
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-10 bg-yvy-bg border-t border-yvy-border px-4 py-3">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 text-sm px-3 py-2.5 rounded-xl bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold transition-colors"
          >
            {copied ? '✓ Lista copiada' : 'Copiar lista'}
          </button>
          <button
            onClick={handleDownload}
            title="Baixar lista como arquivo"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold transition-colors text-sm shrink-0"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
            Baixar
          </button>
        </div>
      </div>
    </div>
  )
}

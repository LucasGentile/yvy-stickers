'use client'

import { useState, useEffect, useRef } from 'react'
import { getUserData } from '@/actions/getUserData'
import { ALL_STICKER_IDS, ALL_STICKER_SECTIONS, StickerGroup, isChromeSticker } from '@/lib/stickers'

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

  const filteredOptions = query.trim()
    ? allOptions.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.sub.toLowerCase().includes(query.toLowerCase())
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

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando...</p>
      </div>
    )
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
    <div className="max-w-lg mx-auto px-4 py-6 pb-10 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Figurinhas Faltantes: <span className="text-yvy-accent">{missingSet.size}</span>
        </h2>
        <a href="/stickers" className="text-xs text-yvy-muted underline">
          ← Figurinhas
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
                    <img
                      src={`https://flagcdn.com/w20/${opt.flagCode}.png`}
                      width={20}
                      height={15}
                      alt={opt.label}
                      className="rounded-sm shrink-0"
                    />
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

      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-5">
        {ALL_STICKER_SECTIONS.map((section) => {
          if (section.type === 'group') {
            const teamsWithMissing = (section as StickerGroup).teams.filter((t) =>
              t.stickers.some((id) => missingSet.has(id))
            )
            if (teamsWithMissing.length === 0) return null
            return (
              <div key={section.label}>
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-yvy-border">
                  <span className="text-base">🌍</span>
                  <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">
                    {section.label}
                  </span>
                </div>
                <div className="space-y-2">
                  {teamsWithMissing.map((team) => (
                    <div key={team.code} id={`missing-${team.code}`} className="scroll-mt-4">
                      <div className="flex items-center gap-1.5 mb-1">
                        <img
                          src={`https://flagcdn.com/w20/${team.flagCode}.png`}
                          width={20}
                          height={15}
                          alt={team.name}
                          className="rounded-sm shrink-0"
                        />
                        <span className="text-xs font-medium text-yvy-text">{team.name}</span>
                        <span className="text-[10px] text-yvy-muted font-mono">{team.code}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {team.stickers.map((id, idx) => {
                          const missing = missingSet.has(id)
                          return (
                            <span
                              key={id}
                              className={`w-10 h-10 rounded-lg text-xs font-semibold flex items-center justify-center ${
                                missing
                                  ? 'bg-amber-50 border border-amber-300 text-amber-800'
                                  : 'bg-yvy-bg text-yvy-border'
                              }${missing && isChromeSticker(id) ? ' ring-2 ring-amber-400 ring-offset-1' : ''}`}
                            >
                              {idx + 1}
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
                className="scroll-mt-4"
              >
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-yvy-border">
                  <span className="text-sm">{section.icon}</span>
                  <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">
                    {section.label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {section.stickers.map((id) => {
                    const missing = missingSet.has(id)
                    return (
                      <span
                        key={id}
                        className={`h-10 px-3 rounded-lg text-xs font-semibold flex items-center ${
                          missing
                            ? 'bg-amber-50 border border-amber-300 text-amber-800'
                            : 'bg-yvy-bg text-yvy-border'
                        }${missing && isChromeSticker(id) ? ' ring-2 ring-amber-400 ring-offset-1' : ''}`}
                      >
                        {id}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          }
        })}
      </div>

      <button
        onClick={handleCopy}
        className="w-full text-sm px-3 py-2.5 rounded-xl border border-yvy-border bg-yvy-surface text-yvy-dark font-medium hover:bg-yvy-border transition-colors"
      >
        {copied ? '✓ Lista copiada' : 'Copiar lista (para compartilhar)'}
      </button>
    </div>
  )
}

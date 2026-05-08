'use client'

import { useState, useEffect } from 'react'
import { getUserData } from '@/actions/getUserData'
import { ALL_STICKER_IDS, ALL_STICKER_SECTIONS, StickerGroup } from '@/lib/stickers'

export default function MissingScreen() {
  const [missingSet, setMissingSet] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('userId')
    setUserId(id)
    if (!id) { setLoading(false); return }
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
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">Ir para o cadastro</a>
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
        <a href="/stickers" className="text-xs text-yvy-muted underline">← Figurinhas</a>
      </div>

      {/* Country/section filter */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por país ou coleção..."
          className="w-full rounded-lg border border-yvy-border pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-surface"
        />
        {filter && (
          <button
            onClick={() => setFilter('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
          >✕</button>
        )}
      </div>

      <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-5">
        {ALL_STICKER_SECTIONS.map((section) => {
          const q = filter.trim().toLowerCase()
          if (section.type === 'group') {
            const teamsWithMissing = (section as StickerGroup).teams.filter((t) =>
              t.stickers.some((id) => missingSet.has(id)) &&
              (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
            )
            if (teamsWithMissing.length === 0) return null
            return (
              <div key={section.label}>
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-yvy-border">
                  <span className="text-base">🌍</span>
                  <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">{section.label}</span>
                </div>
                <div className="space-y-2">
                  {teamsWithMissing.map((team) => (
                    <div key={team.code}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <img src={`https://flagcdn.com/w20/${team.flagCode}.png`} width={20} height={15} alt={team.name} className="rounded-sm shrink-0" />
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
                              }`}
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
            const q = filter.trim().toLowerCase()
            if (q && !section.label.toLowerCase().includes(q)) return null
            const sectionMissing = section.stickers.filter((id) => missingSet.has(id))
            if (sectionMissing.length === 0) return null
            return (
              <div key={section.label}>
                <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-yvy-border">
                  <span className="text-sm">{section.icon}</span>
                  <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">{section.label}</span>
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
                        }`}
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

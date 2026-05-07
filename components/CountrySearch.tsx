'use client'

import { useState, useRef, useEffect } from 'react'
import { ALL_TEAMS } from '@/lib/stickers'

export default function CountrySearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? ALL_TEAMS.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.code.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_TEAMS

  function goTo(code: string) {
    setQuery('')
    setOpen(false)
    const el = document.getElementById(`country-${code}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
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
          placeholder="Ir para um país..."
          className="w-full rounded-lg border border-yvy-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-40 mt-1 w-full bg-yvy-surface border border-yvy-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum país encontrado</p>
          ) : (
            filtered.map((team) => (
              <button
                key={team.code}
                type="button"
                onClick={() => goTo(team.code)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-yvy-bg transition-colors"
              >
                <img
                  src={`https://flagcdn.com/w20/${team.flagCode}.png`}
                  width={20}
                  height={15}
                  alt={team.name}
                  className="rounded-sm shrink-0"
                />
                <span className="text-yvy-text">{team.name}</span>
                <span className="text-yvy-muted font-mono text-xs ml-auto">{team.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

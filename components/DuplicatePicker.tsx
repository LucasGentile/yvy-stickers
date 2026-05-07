'use client'

import { useState, useRef, useEffect } from 'react'
import { ALL_TEAMS, Team } from '@/lib/stickers'

interface Props {
  ownedSet: Set<string>
  onSelect: (stickerId: string) => void
}

export default function DuplicatePicker({ ownedSet, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? ALL_TEAMS.filter(
        (t) =>
          t.name.toLowerCase().includes(query.toLowerCase()) ||
          t.code.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_TEAMS

  function selectTeam(team: Team) {
    setSelectedTeam(team)
    setQuery(team.name)
    setOpen(false)
    onSelect('')
  }

  function selectSticker(id: string) {
    onSelect(id)
    setSelectedTeam(null)
    setQuery('')
  }

  function clear() {
    setQuery('')
    setSelectedTeam(null)
    setOpen(false)
    onSelect('')
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
    <div ref={ref} className="space-y-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-sm pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedTeam(null)
            setOpen(true)
            onSelect('')
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar país..."
          className="w-full rounded-lg border border-yvy-border pl-8 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-yvy-muted text-xs"
          >
            ✕
          </button>
        )}

        {open && !selectedTeam && (
          <div className="absolute z-40 mt-1 w-full bg-yvy-surface border border-yvy-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum país encontrado</p>
            ) : (
              filtered.map((team) => (
                <button
                  key={team.code}
                  type="button"
                  onClick={() => selectTeam(team)}
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

      {selectedTeam && (
        <div className="p-2 bg-yvy-bg rounded-lg border border-yvy-border">
          <p className="text-[10px] text-yvy-muted mb-1.5 font-medium uppercase tracking-wide">
            Figurinhas que você tem — clique para selecionar
          </p>
          <div className="flex flex-wrap gap-1">
            {selectedTeam.stickers.map((id, idx) => {
              const owned = ownedSet.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!owned}
                  onClick={() => selectSticker(id)}
                  className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                    owned
                      ? 'bg-yvy-dark text-white hover:bg-yvy-dark-hover'
                      : 'bg-yvy-border text-yvy-muted opacity-40 cursor-not-allowed'
                  }`}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

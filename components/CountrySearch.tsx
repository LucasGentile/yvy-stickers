'use client'

import { useState, useRef, useEffect } from 'react'
import { ALL_TEAMS, ALL_STICKER_SECTIONS, type StickerSpecial } from '@/lib/stickers'

const SPECIAL_SECTIONS = ALL_STICKER_SECTIONS.filter(
  (s): s is StickerSpecial => s.type === 'special'
)

export default function CountrySearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const q = query.trim().toLowerCase()

  const filteredTeams = q
    ? ALL_TEAMS.filter((t) => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    : ALL_TEAMS

  const filteredSections = q
    ? SPECIAL_SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(q) || s.stickers.some((id) => id.toLowerCase().includes(q))
      )
    : SPECIAL_SECTIONS

  const hasResults = filteredTeams.length > 0 || filteredSections.length > 0

  function scrollToElement(id: string) {
    const el = document.getElementById(id)
    const scroller = document.querySelector('main')
    if (!el || !scroller) return
    const offset = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const stickyHeight = ref.current?.offsetHeight ?? 0
    scroller.scrollTo({ top: offset - stickyHeight - 8, behavior: 'smooth' })
  }

  function goToTeam(code: string) {
    setQuery('')
    setOpen(false)
    scrollToElement(`country-${code}`)
  }

  function goToSection(label: string) {
    setQuery('')
    setOpen(false)
    scrollToElement(`section-${label}`)
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
          placeholder="Ir para um país ou seção..."
          className="w-full rounded-lg border border-yvy-border pl-8 pr-3 py-2 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-yvy-accent bg-yvy-bg"
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
          {!hasResults ? (
            <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum resultado encontrado</p>
          ) : (
            <>
              {filteredSections.map((section) => (
                <button
                  key={section.label}
                  type="button"
                  onClick={() => goToSection(section.label)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-yvy-bg transition-colors"
                >
                  <span className="w-5 text-center shrink-0">{section.icon}</span>
                  <span className="text-yvy-text">{section.label}</span>
                </button>
              ))}
              {filteredTeams.map((team) => (
                <button
                  key={team.code}
                  type="button"
                  onClick={() => goToTeam(team.code)}
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
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import { ALL_TEAMS, ALL_STICKER_SECTIONS, StickerSpecial } from '@/lib/stickers'

// Unified shape for both country teams and special sections
type PickerSection = {
  key: string
  label: string
  flagCode?: string
  icon?: string
  stickers: string[]
  isSpecial: boolean
}

const ALL_SECTIONS: PickerSection[] = [
  ...ALL_TEAMS.map((t) => ({
    key: t.code,
    label: t.name,
    flagCode: t.flagCode,
    stickers: t.stickers,
    isSpecial: false,
  })),
  ...ALL_STICKER_SECTIONS.filter((s): s is StickerSpecial => s.type === 'special').map((s) => ({
    key: s.label,
    label: s.label,
    icon: s.icon,
    stickers: s.stickers,
    isSpecial: true,
  })),
]

interface Props {
  ownedSet: Set<string>
  onSelect: (stickerId: string, currentCount?: number) => void
  selectedId?: string
  duplicatesMap?: Record<string, number>
}

export default function DuplicatePicker({
  ownedSet,
  onSelect,
  selectedId,
  duplicatesMap = {},
}: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PickerSection | null>(null)
  const [sectionOrder, setSectionOrder] = useState<'album' | 'alpha'>('album')
  const ref = useRef<HTMLDivElement>(null)

  const orderedSections = sectionOrder === 'alpha'
    ? [
        ...ALL_SECTIONS.filter((s) => !s.isSpecial).sort((a, b) =>
          a.label.localeCompare(b.label, 'pt-BR')
        ),
        ...ALL_SECTIONS.filter((s) => s.isSpecial),
      ]
    : ALL_SECTIONS

  const filtered = query.trim()
    ? orderedSections.filter(
        (s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.key.toLowerCase().includes(query.toLowerCase()) ||
          (s.isSpecial &&
            s.stickers.some((id) => id.toLowerCase().includes(query.toLowerCase())))
      )
    : orderedSections

  function selectSection(section: PickerSection) {
    setSelected(section)
    setQuery(section.label)
    setOpen(false)
    onSelect('')
  }

  function selectSticker(id: string) {
    onSelect(id, duplicatesMap[id])
    // Keep section open so user can quickly pick the next sticker
  }

  function clear() {
    setQuery('')
    setSelected(null)
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
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yvy-muted text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
              setOpen(true)
              onSelect('')
            }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar país ou coleção..."
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

        {open && !selected && (
          <div className="absolute z-40 mt-1 w-full bg-yvy-surface border border-yvy-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-yvy-muted">Nenhum resultado encontrado</p>
            ) : (
              filtered.map((section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() => selectSection(section)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-yvy-bg transition-colors"
                >
                  {section.isSpecial ? (
                    <span className="w-5 text-center shrink-0">{section.icon}</span>
                  ) : (
                    <img
                      src={`https://flagcdn.com/w20/${section.flagCode}.png`}
                      width={20}
                      height={15}
                      alt={section.label}
                      className="rounded-sm shrink-0"
                    />
                  )}
                  <span className="text-yvy-text">{section.label}</span>
                  {!section.isSpecial && (
                    <span className="text-yvy-muted font-mono text-xs ml-auto">{section.key}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
        </div>

        {/* Section order toggle */}
        <div className="flex gap-1 shrink-0">
          {(['album', 'alpha'] as const).map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setSectionOrder(val)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                sectionOrder === val
                  ? 'bg-yvy-dark text-white'
                  : 'bg-yvy-border text-yvy-muted hover:bg-yvy-dark/20'
              }`}
            >
              {val === 'album' ? '📋' : 'A–Z'}
            </button>
          ))}
        </div>
      </div>

      {selected && (
        <div className="p-2 bg-yvy-bg rounded-lg border border-yvy-border">
          <p className="text-[10px] text-yvy-muted mb-1.5 font-medium uppercase tracking-wide">
            Figurinhas que você tem — clique para selecionar
          </p>
          <div className="flex flex-wrap gap-1">
            {selected.stickers.map((id, idx) => {
              const owned = ownedSet.has(id)
              const isSelected = id === selectedId
              const dupeCount = duplicatesMap[id]
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!owned}
                  onClick={() => selectSticker(id)}
                  className={`relative rounded-lg text-xs font-semibold transition-colors ${
                    selected.isSpecial ? 'px-2 h-8' : 'w-10 h-10'
                  } ${
                    isSelected
                      ? 'bg-yvy-accent text-white ring-2 ring-yvy-accent ring-offset-1'
                      : owned
                        ? 'bg-yvy-dark text-white hover:bg-yvy-dark-hover'
                        : 'bg-yvy-border text-yvy-muted opacity-40 cursor-not-allowed'
                  }`}
                >
                  {selected.isSpecial ? id : idx + 1}
                  {dupeCount && !isSelected && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-yvy-gold text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                      {dupeCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

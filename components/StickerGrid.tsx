'use client'

import { memo } from 'react'
import { ALL_STICKER_SECTIONS } from '@/lib/stickers'

interface Props {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  onBulkChange?: (next: Set<string>, message: string) => void
}

function TrophySVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 2H17V13C17 15.761 14.761 18 12 18C9.239 18 7 15.761 7 13V2Z" fill="#c9a227" />
      <path d="M7 5H4C4 5 3 10 7 11V5Z" fill="#c9a227" />
      <path d="M17 5H20C20 5 21 10 17 11V5Z" fill="#c9a227" />
      <rect x="9" y="18" width="6" height="2" fill="#c9a227" />
      <rect x="7" y="20" width="10" height="2" rx="1" fill="#c9a227" />
    </svg>
  )
}

function CocaColaSVG() {
  return (
    <svg width="40" height="14" viewBox="0 0 80 24" aria-hidden="true">
      <rect width="80" height="24" rx="3" fill="#E61A2B" />
      <text
        x="40"
        y="17"
        textAnchor="middle"
        fontFamily="Georgia, serif"
        fontStyle="italic"
        fontWeight="bold"
        fontSize="14"
        fill="white"
        letterSpacing="0.5"
      >
        Coca-Cola
      </text>
    </svg>
  )
}

function SectionIcon({ label, icon }: { label: string; icon: string }) {
  if (label === 'Figurinhas Coca-Cola') return <CocaColaSVG />
  if (label === 'Página Inicial' || label === 'FIFA World Cup History') return <TrophySVG />
  return <span className="text-sm">{icon}</span>
}

function StickerGrid({ selected, onChange, onBulkChange }: Props) {
  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  function toggleTeam(team: { name: string; stickers: string[] }) {
    const allOn = team.stickers.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allOn) {
      team.stickers.forEach((id) => next.delete(id))
    } else {
      team.stickers.forEach((id) => next.add(id))
    }
    const message = allOn ? `${team.name} desmarcado` : `${team.name} marcado`
    if (onBulkChange) onBulkChange(next, message)
    else onChange(next)
  }

  return (
    <div className="space-y-5">
      {ALL_STICKER_SECTIONS.map((section) => (
        <div key={section.label}>
          {/* Section header */}
          <div className="flex items-center gap-1.5 mb-2 pb-1 border-b border-yvy-border">
            {'icon' in section ? (
              <SectionIcon label={section.label} icon={section.icon} />
            ) : (
              <span className="text-base">🌍</span>
            )}
            {section.label !== 'Figurinhas Coca-Cola' && (
              <span className="text-xs font-bold text-yvy-dark uppercase tracking-wide">
                {section.label}
              </span>
            )}
          </div>

          {section.type === 'group' ? (
            <div className="space-y-2">
              {section.teams.map((team) => (
                <div key={team.code} id={`country-${team.code}`} className="scroll-mt-20">
                  {/* Country row header */}
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
                    <button
                      type="button"
                      onClick={() => toggleTeam(team)}
                      className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                        team.stickers.every((id) => selected.has(id))
                          ? 'bg-yvy-dark text-white'
                          : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
                      }`}
                    >
                      {team.stickers.every((id) => selected.has(id)) ? 'Desmarcar' : 'Marcar todos'}
                    </button>
                  </div>
                  {/* Sticker chips — show number only (1–20) */}
                  <div className="flex flex-wrap gap-1">
                    {team.stickers.map((id, idx) => {
                      const on = selected.has(id)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggle(id)}
                          className={`w-10 h-10 rounded-lg text-xs font-semibold transition-colors ${
                            on
                              ? 'bg-yvy-dark text-white'
                              : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Special section — show full sticker code */
            <div className="flex flex-wrap gap-1">
              {section.stickers.map((id) => {
                const on = selected.has(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    className={`h-10 px-3 rounded-lg text-xs font-semibold transition-colors ${
                      on ? 'bg-yvy-dark text-white' : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
                    }`}
                  >
                    {id}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default memo(StickerGrid)

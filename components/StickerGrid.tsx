'use client'

import { memo, useRef } from 'react'
import { ALL_STICKER_SECTIONS, isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

interface Props {
  selected: Set<string>
  onChange: (next: Set<string>) => void
  onBulkChange?: (next: Set<string>, message: string) => void
  tradeReceived?: Set<string>
  newestFromTrade?: Set<string>
  staged?: Set<string>
  tradeLocked?: Set<string>
  onLongPress?: (id: string) => void
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

function stickerColor(
  id: string,
  on: boolean,
  tradeReceived?: Set<string>,
  staged?: Set<string>
): string {
  if (!on) return 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
  if (staged?.has(id)) return 'bg-green-400 text-white'
  if (tradeReceived?.has(id)) return 'bg-blue-500 text-white'
  return tradeReceived ? 'bg-green-600 text-white' : 'bg-yvy-dark text-white'
}

function StickerGrid({
  selected,
  onChange,
  onBulkChange,
  tradeReceived,
  newestFromTrade,
  staged,
  tradeLocked,
  onLongPress,
}: Props) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressNextClick = useRef(false)

  function handleTouchStart(id: string, on: boolean) {
    if (!on || !onLongPress || tradeLocked?.has(id)) return
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      suppressNextClick.current = true
      navigator.vibrate?.(50)
      onLongPress(id)
    }, 500)
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  function handleClick(id: string) {
    if (suppressNextClick.current) {
      suppressNextClick.current = false
      return
    }
    if (tradeLocked?.has(id)) return
    toggle(id)
  }

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
      {ALL_STICKER_SECTIONS.map((section) => {
        const sectionStickers =
          section.type === 'group' ? section.teams.flatMap((t) => t.stickers) : section.stickers
        const sectionOwned = sectionStickers.filter((id) => selected.has(id)).length
        const sectionTotal = sectionStickers.length
        const sectionPct = Math.round((sectionOwned / sectionTotal) * 100)
        const sectionComplete = sectionOwned === sectionTotal
        return (
          <div key={section.label}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-yvy-border">
              {'icon' in section ? (
                <SectionIcon label={section.label} icon={section.icon} />
              ) : (
                <span className="text-lg">🌍</span>
              )}
              {section.label !== 'Figurinhas Coca-Cola' && (
                <span className="text-sm font-bold text-yvy-dark uppercase tracking-wide">
                  {section.label}
                </span>
              )}
              <span
                className={`ml-auto text-xs font-semibold ${sectionComplete ? 'text-green-600' : 'text-yvy-muted'}`}
              >
                {sectionOwned}/{sectionTotal} · {sectionPct}%
              </span>
            </div>

            {section.type === 'group' ? (
              <div className="space-y-2">
                {section.teams.map((team) => {
                  const ownedCount = team.stickers.filter((id) => selected.has(id)).length
                  const total = team.stickers.length
                  const pct = Math.round((ownedCount / total) * 100)
                  const complete = ownedCount === total
                  return (
                    <div key={team.code} id={`country-${team.code}`} className="scroll-mt-20">
                      {/* Country row header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <img
                          src={`https://flagcdn.com/w40/${team.flagCode}.png`}
                          alt={team.name}
                          className="rounded-sm shrink-0 object-cover w-8 h-[18px]"
                        />
                        <span className="text-sm font-semibold text-yvy-text">{team.name}</span>
                        <span className="text-xs text-yvy-muted font-mono">{team.code}</span>
                        <span
                          className={`text-xs font-semibold ${complete ? 'text-green-600' : 'text-yvy-muted'}`}
                        >
                          {ownedCount}/{total} · {pct}%
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleTeam(team)}
                          className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded transition-colors shrink-0 ${
                            complete
                              ? 'bg-yvy-dark text-white'
                              : 'bg-yvy-bg text-yvy-muted hover:bg-yvy-border'
                          }`}
                        >
                          {complete ? 'Desmarcar' : 'Marcar todos'}
                        </button>
                      </div>
                      {/* Sticker chips — show number only (1–20) */}
                      <div className="flex flex-wrap gap-1">
                        {team.stickers.map((id, idx) => {
                          const on = selected.has(id)
                          const isNew = on && newestFromTrade?.has(id)
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => handleClick(id)}
                              onTouchStart={() => handleTouchStart(id, on)}
                              onTouchEnd={cancelLongPress}
                              onTouchMove={cancelLongPress}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (on && onLongPress) {
                                  navigator.vibrate?.(50)
                                  onLongPress(id)
                                }
                              }}
                              className={`relative w-9 h-12 rounded-sm text-xs font-semibold transition-colors shadow-sm ${tradeLocked?.has(id) ? 'bg-white text-yvy-dark ring-2 ring-inset ring-blue-400' : stickerColor(id, on, tradeReceived, staged)}`}
                            >
                              {isChromeSticker(id) ? (
                                <span className="font-bold text-amber-400">{idx + 1}</span>
                              ) : (
                                idx + 1
                              )}
                              {isNew && (
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Special section — show full sticker code */
              <div className="flex flex-wrap gap-1">
                {section.stickers.map((id) => {
                  const on = selected.has(id)
                  const isNew = on && newestFromTrade?.has(id)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleClick(id)}
                      onTouchStart={() => handleTouchStart(id, on)}
                      onTouchEnd={cancelLongPress}
                      onTouchMove={cancelLongPress}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        if (on && onLongPress) {
                          navigator.vibrate?.(50)
                          onLongPress(id)
                        }
                      }}
                      className={`relative ${id.startsWith('FWC') ? 'w-12 h-12' : 'h-12 px-3'} rounded-sm text-xs font-semibold transition-colors shadow-sm ${tradeLocked?.has(id) ? 'bg-white text-yvy-dark ring-2 ring-inset ring-blue-400' : stickerColor(id, on, tradeReceived, staged)}`}
                    >
                      {id.startsWith('FWC') ? (
                        <span className="font-bold text-amber-400">{id === 'FWC00' ? '00' : id}</span>
                      ) : isCocaColaSticker(id) ? (
                        <span className="font-bold text-red-500 [text-shadow:0_0_4px_#fff,0_0_4px_#fff]">{id}</span>
                      ) : (
                        id
                      )}
                      {isNew && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(StickerGrid)

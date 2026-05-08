'use client'

import { useEffect, useRef, useState } from 'react'

const SIZES = [
  { label: 'A', px: 15 },
  { label: 'A+', px: 18 },
  { label: 'A++', px: 21 },
]

export default function FontSizeToggle() {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('fontSize')
    const idx = saved ? parseInt(saved, 10) : 0
    setActive(idx)
    document.documentElement.style.fontSize = `${SIZES[idx].px}px`
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function pick(idx: number) {
    setActive(idx)
    localStorage.setItem('fontSize', String(idx))
    document.documentElement.style.fontSize = `${SIZES[idx].px}px`
    setOpen(false)
  }

  return (
    <div ref={ref} className="fixed bottom-6 left-4 z-40 flex flex-col items-start gap-1.5">
      {/* Options — appear above the button when open */}
      {open && (
        <div className="flex flex-col items-start gap-1">
          {[...SIZES].reverse().map((s, ri) => {
            const i = SIZES.length - 1 - ri
            return (
              <button
                key={s.label}
                onClick={() => pick(i)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-colors ${
                  active === i
                    ? 'bg-yvy-dark text-white'
                    : 'bg-yvy-surface border border-yvy-border text-yvy-text hover:bg-yvy-border'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Main Aa button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Tamanho de fonte"
        className="w-10 h-10 rounded-full bg-yvy-dark text-white font-bold shadow-lg flex items-center justify-center hover:bg-yvy-dark-hover transition-colors"
        style={{ fontSize: '12px' }}
      >
        Aa
      </button>
    </div>
  )
}

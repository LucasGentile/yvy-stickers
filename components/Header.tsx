'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

const GROUP_URL = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL!

const SIZES = [
  { label: 'A', px: 15 },
  { label: 'A+', px: 18 },
  { label: 'A++', px: 21 },
]

export default function Header() {
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
    <header className="sticky top-0 z-10 bg-yvy-dark text-white shadow-md">
      <div className="max-w-lg mx-auto px-4 py-3 relative flex items-center justify-center">
        {/* Centered title */}
        <Link
          href="/"
          className="tracking-[0.12em] uppercase"
          style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: '1.5rem', lineHeight: 1 }}
        >
          YVY Figurinhas
        </Link>

        {/* Right side: font toggle + WhatsApp */}
        <div className="absolute right-4 flex items-center gap-2.5">
          {/* Font size — discreet, expands down */}
          <div ref={ref} className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-white/50 hover:text-white transition-colors font-bold leading-none"
              style={{ fontSize: '11px' }}
              aria-label="Tamanho de fonte"
            >
              Aa
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-2 bg-yvy-surface border border-yvy-border rounded-xl shadow-lg overflow-hidden z-50" style={{ fontSize: '12px', minWidth: '80px' }}>
                {SIZES.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => pick(i)}
                    className={`w-full px-4 py-2 text-left text-sm font-medium transition-colors ${
                      active === i
                        ? 'bg-yvy-dark text-white'
                        : 'text-yvy-text hover:bg-yvy-bg'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp group */}
          <a
            href={GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white text-yvy-dark font-semibold text-sm px-3 py-1.5 rounded-full hover:bg-yvy-bg transition-colors shrink-0"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span className="hidden sm:inline">Grupo YVY</span>
          </a>
        </div>
      </div>
    </header>
  )
}

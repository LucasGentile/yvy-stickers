'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { getPendingTrades } from '@/actions/getPendingTrades'
import { getPendingApprovalCount } from '@/actions/getPendingApprovalCount'
import { usePrefs } from '@/contexts/PreferencesContext'

const MAIN_NAV = [
  { href: '/stickers', label: 'Minhas Figurinhas' },
  { href: '/duplicates', label: 'Repetidas' },
  { href: '/missing', label: 'Faltantes' },
  { href: '/matches', label: 'Ranking de Trocas' },
  { href: '/verificar', label: 'Verificar Figurinha' },
  { href: '/historico', label: 'Histórico' },
  { href: '/ranking', label: 'Ranking do Álbum' },
]

const SOCIAL_NAV = [
  { href: '/panelinhas', label: 'Panelinhas do YVYs' },
  { href: '/mural', label: 'Mural do YVY' },
]

const FONT_SIZES = [
  { label: 'A', px: 15 },
  { label: 'A+', px: 18 },
  { label: 'A++', px: 21 },
]

export default function Header() {
  const [groupHref, setGroupHref] = useState('/group')
  const [menuOpen, setMenuOpen] = useState(false)
  const [fontSize, setFontSize] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [pendingApprovalCount, setPendingApprovalCount] = useState<number | null>(null)
  const pathname = usePathname()
  const { stickerOrder, setStickerOrder } = usePrefs()

  function refreshBadges(uid: string) {
    getPendingTrades(uid)
      .then((r) => {
        const rollbackFromOthers = r.recentlyAccepted.filter(
          (t) => t.rollbackRequestedBy !== null && t.rollbackRequestedBy !== uid
        ).length
        setPendingCount(r.received.length + rollbackFromOthers)
      })
      .catch(() => {})
    getPendingApprovalCount(uid)
      .then(setPendingApprovalCount)
      .catch(() => {})
  }

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (uid) {
      setGroupHref(`/group?uid=${uid}`)
      refreshBadges(uid)
    }
    const saved = localStorage.getItem('fontSize')
    const idx = saved ? parseInt(saved, 10) : 0
    setFontSize(idx)
    document.documentElement.style.fontSize = `${FONT_SIZES[idx].px}px`
  }, [])

  // Refresh badges when navigating
  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (uid) refreshBadges(uid)
  }, [pathname])

  // Close drawer on navigation
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  function pickFontSize(idx: number) {
    setFontSize(idx)
    localStorage.setItem('fontSize', String(idx))
    document.documentElement.style.fontSize = `${FONT_SIZES[idx].px}px`
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[70] bg-yvy-dark text-white shadow-md"
        style={{ willChange: 'transform' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3 relative flex items-center justify-center">
          {/* Left: hamburger */}
          <div className="absolute left-4">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              className="relative flex flex-col gap-[5px] justify-center items-center w-8 h-8"
            >
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              <span className="block w-5 h-0.5 bg-white rounded-full" />
              {pendingCount + (pendingApprovalCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                  {pendingCount + (pendingApprovalCount ?? 0) > 9
                    ? '9+'
                    : pendingCount + (pendingApprovalCount ?? 0)}
                </span>
              )}
            </button>
          </div>

          {/* Center: title */}
          <Link
            href="/stickers"
            className="tracking-[0.12em] uppercase"
            style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: '1.5rem', lineHeight: 1 }}
          >
            YVY Figurinhas
          </Link>
        </div>
      </header>

      {/* Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] flex">
          {/* Panel */}
          <div className="w-64 bg-yvy-dark text-white h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-white/10">
              <span
                className="tracking-[0.12em] uppercase opacity-80"
                style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: '1.1rem' }}
              >
                Menu
              </span>
            </div>

            <nav className="flex-1 py-2 overflow-y-auto">
              {MAIN_NAV.map((item) => {
                const active = pathname === item.href
                const showDot = item.href === '/matches' && pendingCount > 0
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-5 py-3.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {showDot && (
                      <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                    {active && !showDot && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </Link>
                )
              })}

              <div className="mx-5 my-1 border-t border-white/10" />

              {SOCIAL_NAV.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-5 py-3.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-white/15 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
                  </Link>
                )
              })}

              {/* Admin-only item */}
              {pendingApprovalCount !== null &&
                (() => {
                  const active = pathname === '/admin'
                  return (
                    <Link
                      href="/admin"
                      className={`flex items-center px-5 py-3.5 text-sm font-medium transition-colors border-t border-white/10 mt-1 pt-3.5 ${
                        active
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>Aprovações</span>
                      {pendingApprovalCount > 0 && (
                        <span className="ml-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {pendingApprovalCount > 9 ? '9+' : pendingApprovalCount}
                        </span>
                      )}
                      {active && pendingApprovalCount === 0 && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </Link>
                  )
                })()}
            </nav>

            {/* Font size */}
            <div className="px-5 py-4 border-t border-white/10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                Tamanho do texto
              </p>
              <div className="flex gap-2">
                {FONT_SIZES.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => pickFontSize(i)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      fontSize === i
                        ? 'bg-white text-yvy-dark'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sticker order */}
            <div className="px-5 py-4 border-t border-white/10 space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-semibold">
                Ordem das figurinhas
              </p>
              <div className="flex gap-2">
                {([['album', 'Álbum'], ['alpha', 'A–Z']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setStickerOrder(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      stickerOrder === val
                        ? 'bg-white text-yvy-dark'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* WhatsApp */}
            <div className="px-5 py-4 border-t border-white/10">
              <a
                href={groupHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-white/60 hover:text-white transition-colors"
              >
                <svg
                  className="w-4 h-4 fill-current flex-shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Grupo do WhatsApp
              </a>
            </div>
          </div>

          {/* Backdrop */}
          <div className="flex-1 bg-black/50" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </>
  )
}

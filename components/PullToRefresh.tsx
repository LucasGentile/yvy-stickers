'use client'

import { useEffect, useRef, useState } from 'react'

const TRIGGER_PX = 64   // raw finger travel to trigger refresh
const MAX_VISUAL = 60   // max px the indicator travels below the header

export function PullToRefresh() {
  const startY = useRef(0)
  const active = useRef(false)
  const rawDist = useRef(0)
  const [visual, setVisual] = useState(0)
  const [ready, setReady] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const el = document.querySelector('main') as HTMLElement | null
    if (!el) return

    function onStart(e: TouchEvent) {
      if (el!.scrollTop > 0) return
      startY.current = e.touches[0].clientY
      active.current = true
      rawDist.current = 0
    }

    function onMove(e: TouchEvent) {
      if (!active.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) {
        active.current = false
        setVisual(0)
        setReady(false)
        rawDist.current = 0
        return
      }
      rawDist.current = dy
      // sqrt gives a rubber-band feel
      const v = Math.min(MAX_VISUAL, Math.sqrt(dy) * 5.5)
      setVisual(v)
      setReady(dy >= TRIGGER_PX)
      if (dy > 4) e.preventDefault()
    }

    function onEnd() {
      if (!active.current) return
      active.current = false
      const dist = rawDist.current
      rawDist.current = 0
      if (dist >= TRIGGER_PX) {
        setRefreshing(true)
        setReady(false)
        setVisual(MAX_VISUAL)
        window.dispatchEvent(new Event('pull-refresh'))
        setTimeout(() => {
          setRefreshing(false)
          setVisual(0)
        }, 1200)
      } else {
        setVisual(0)
        setReady(false)
      }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (visual === 0 && !refreshing) return null

  const pct = Math.min(1, visual / MAX_VISUAL)

  return (
    <div
      aria-hidden
      className="fixed left-1/2 z-[65] pointer-events-none"
      style={{
        // starts just behind the header, slides down proportional to pull
        top: `${56 + visual - 28}px`,
        transform: 'translateX(-50%)',
      }}
    >
      <div
        className={`w-8 h-8 rounded-full shadow-md flex items-center justify-center transition-colors duration-100 ${
          ready || refreshing
            ? 'bg-yvy-gold text-yvy-dark'
            : 'bg-white text-yvy-muted'
        }`}
        style={{ opacity: pct }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${pct * 360}deg)` }}
        >
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </div>
    </div>
  )
}

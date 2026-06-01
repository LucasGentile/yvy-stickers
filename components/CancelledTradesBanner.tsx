'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  getUnacknowledgedCancellations,
  type UnacknowledgedCancellation,
} from '@/actions/getUnacknowledgedCancellations'

export default function CancelledTradesBanner() {
  const [items, setItems] = useState<UnacknowledgedCancellation[]>([])
  const router = useRouter()

  useEffect(() => {
    const userId = localStorage.getItem('userId')
    if (!userId) return
    getUnacknowledgedCancellations(userId).then(setItems)

    const handleVisibility = () => {
      if (!document.hidden) getUnacknowledgedCancellations(userId).then(setItems)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  if (items.length === 0) return null

  const names = [...new Set(items.map((i) => i.otherUserName))]
  const nameText =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`
  const totalStickers = items.reduce((sum, i) => sum + i.myGivingIds.length, 0)

  return (
    <button
      onClick={() => router.push('/matches')}
      className="w-full bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex items-center gap-3 text-left hover:bg-amber-100 transition-colors"
    >
      <span className="text-lg shrink-0">↩️</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-800 leading-tight">
          Troca{items.length > 1 ? 's' : ''} cancelada{items.length > 1 ? 's' : ''} com {nameText}
        </p>
        <p className="text-[11px] text-amber-700 leading-tight mt-0.5">
          Devolva {totalStickers === 1 ? 'a figurinha' : `as ${totalStickers} figurinhas`} ao
          baralho · Confirme no Ranking de Trocas
        </p>
      </div>
      <svg
        className="w-4 h-4 shrink-0 text-amber-600"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  )
}

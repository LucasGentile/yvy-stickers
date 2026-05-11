'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type StickerOrder = 'album' | 'alpha'

type PrefsContextValue = {
  stickerOrder: StickerOrder
  setStickerOrder: (o: StickerOrder) => void
}

const PrefsContext = createContext<PrefsContextValue>({
  stickerOrder: 'album',
  setStickerOrder: () => {},
})

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [stickerOrder, setStickerOrderState] = useState<StickerOrder>('album')

  useEffect(() => {
    const saved = localStorage.getItem('stickerOrder') as StickerOrder | null
    if (saved === 'album' || saved === 'alpha') setStickerOrderState(saved)
  }, [])

  function setStickerOrder(o: StickerOrder) {
    setStickerOrderState(o)
    localStorage.setItem('stickerOrder', o)
  }

  return (
    <PrefsContext.Provider value={{ stickerOrder, setStickerOrder }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}

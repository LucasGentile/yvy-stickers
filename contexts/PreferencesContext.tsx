'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type StickerOrder = 'album' | 'alpha'

type PrefsContextValue = {
  stickerOrder: StickerOrder
  setStickerOrder: (o: StickerOrder) => void
  fontIndex: number
  setFontIndex: (i: number) => void
}

const PrefsContext = createContext<PrefsContextValue>({
  stickerOrder: 'album',
  setStickerOrder: () => {},
  fontIndex: 0,
  setFontIndex: () => {},
})

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [stickerOrder, setStickerOrderState] = useState<StickerOrder>('album')
  const [fontIndex, setFontIndex] = useState(0)

  useEffect(() => {
    const savedOrder = localStorage.getItem('stickerOrder') as StickerOrder | null
    if (savedOrder === 'album' || savedOrder === 'alpha') setStickerOrderState(savedOrder)
    const savedFont = localStorage.getItem('fontSize')
    if (savedFont !== null) {
      const idx = parseInt(savedFont, 10)
      if (!isNaN(idx) && idx >= 0 && idx <= 2) setFontIndex(idx)
    }
  }, [])

  function setStickerOrder(o: StickerOrder) {
    setStickerOrderState(o)
    localStorage.setItem('stickerOrder', o)
  }

  return (
    <PrefsContext.Provider value={{ stickerOrder, setStickerOrder, fontIndex, setFontIndex }}>
      {children}
    </PrefsContext.Provider>
  )
}

export function usePrefs() {
  return useContext(PrefsContext)
}

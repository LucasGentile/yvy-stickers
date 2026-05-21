'use client'

import { createContext, useContext, useState } from 'react'

export const MURAL_TABS = [
  { id: 'ranking', label: 'Ranking' },
  { id: 'mural', label: 'Mural' },
  { id: 'panelinhas', label: 'Panelinhas' },
] as const

export type MuralTab = (typeof MURAL_TABS)[number]['id']

const MuralTabContext = createContext<{ tab: MuralTab; setTab: (t: MuralTab) => void }>({
  tab: 'ranking',
  setTab: () => {},
})

export function MuralTabProvider({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<MuralTab>('ranking')
  return <MuralTabContext.Provider value={{ tab, setTab }}>{children}</MuralTabContext.Provider>
}

export function useMuralTab() {
  return useContext(MuralTabContext)
}

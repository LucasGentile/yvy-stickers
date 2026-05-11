'use client'

import { PrefsProvider } from '@/contexts/PreferencesContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <PrefsProvider>{children}</PrefsProvider>
}

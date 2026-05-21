'use client'

import { PrefsProvider } from '@/contexts/PreferencesContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MuralTabProvider } from '@/contexts/MuralTabContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <NotificationProvider>
        <MuralTabProvider>
          {children}
        </MuralTabProvider>
      </NotificationProvider>
    </PrefsProvider>
  )
}

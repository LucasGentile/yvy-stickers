'use client'

import { PrefsProvider } from '@/contexts/PreferencesContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MuralTabProvider } from '@/contexts/MuralTabContext'
import NotificationBanner from '@/components/NotificationBanner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <NotificationProvider>
        <MuralTabProvider>
          <NotificationBanner />
          {children}
        </MuralTabProvider>
      </NotificationProvider>
    </PrefsProvider>
  )
}

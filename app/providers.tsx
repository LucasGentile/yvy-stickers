'use client'

import { PrefsProvider } from '@/contexts/PreferencesContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { MuralTabProvider } from '@/contexts/MuralTabContext'
import { PullToRefresh } from '@/components/PullToRefresh'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <NotificationProvider>
        <MuralTabProvider>
          <PullToRefresh />
          {children}
        </MuralTabProvider>
      </NotificationProvider>
    </PrefsProvider>
  )
}

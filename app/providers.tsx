'use client'

import { PrefsProvider } from '@/contexts/PreferencesContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import NotificationBanner from '@/components/NotificationBanner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrefsProvider>
      <NotificationProvider>
        <NotificationBanner />
        {children}
      </NotificationProvider>
    </PrefsProvider>
  )
}

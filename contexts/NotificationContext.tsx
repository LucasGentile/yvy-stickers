'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type NotificationType = 'success' | 'error'

export type Notification = {
  id: string
  type: NotificationType
  message: string
}

type NotificationContextValue = {
  notification: Notification | null
  showSuccess: (message: string) => void
  showError: (message: string) => void
  dismiss: () => void
}

const NotificationContext = createContext<NotificationContextValue>({
  notification: null,
  showSuccess: () => {},
  showError: () => {},
  dismiss: () => {},
})

const AUTO_DISMISS_MS = 5000

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setNotification(null)
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const show = useCallback((type: NotificationType, message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const id = crypto.randomUUID()
    setNotification({ id, type, message })
    timerRef.current = setTimeout(() => {
      setNotification(null)
      timerRef.current = null
    }, AUTO_DISMISS_MS)
  }, [])

  const showSuccess = useCallback((message: string) => show('success', message), [show])
  const showError = useCallback((message: string) => show('error', message), [show])

  return (
    <NotificationContext.Provider value={{ notification, showSuccess, showError, dismiss }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}

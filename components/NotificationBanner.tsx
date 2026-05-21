'use client'

import { useNotification } from '@/contexts/NotificationContext'

export default function NotificationBanner() {
  const { notification, dismiss } = useNotification()

  if (!notification) return null

  const isSuccess = notification.type === 'success'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full max-w-lg mx-auto flex items-center gap-3 px-4 py-3 shadow-lg rounded-b-xl animate-slideDown ${
        isSuccess
          ? 'bg-emerald-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span className="text-sm shrink-0">{isSuccess ? '✓' : '✕'}</span>
      <p className="text-sm flex-1 leading-snug">{notification.message}</p>
      <button
        onClick={dismiss}
        aria-label="Fechar notificação"
        className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}

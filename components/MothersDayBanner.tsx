'use client'

import { useEffect, useState } from 'react'

export default function MothersDayBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const now = new Date()
    const isMothersDay = now.getMonth() === 4 && now.getDate() === 10
    if (!isMothersDay) return
    const dismissed = sessionStorage.getItem('mothers-day-2026-dismissed')
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem('mothers-day-2026-dismissed', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-[fadeInScale_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flowers */}
        <p className="text-center text-4xl">💐</p>

        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold text-yvy-dark">Feliz Dia das Mães!</h2>
          <p className="text-sm text-yvy-text leading-relaxed">
            Pra mãe que foi ao mercado buscar <em>"só aquelas duas que faltam"</em> e voltou com 12
            pacotinhos.
          </p>
          <p className="text-sm text-yvy-text leading-relaxed">
            Pra mãe que sabe de cor quantas figurinhas faltam de cada seleção — não porque gosta de
            futebol, mas porque colou cada uma ao lado do filho.
          </p>
          <p className="text-sm text-yvy-text leading-relaxed">
            Pra mãe que tem mais figurinha repetida que o filho — e ainda não entende como chegou
            nisso.
          </p>
          <p className="text-sm font-semibold text-yvy-dark pt-1">
            Vocês merecem o álbum completo. ❤️
          </p>
        </div>

        <button
          onClick={dismiss}
          className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-3 rounded-2xl text-sm transition-colors"
        >
          ❤️ Fechar
        </button>
      </div>
    </div>
  )
}

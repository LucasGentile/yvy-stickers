'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function PrankBanner() {
  const [step, setStep] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (!uid) return
    const dismissed = sessionStorage.getItem('prank-2026-dismissed')
    if (!dismissed) setStep(1)
  }, [])

  function dismiss() {
    sessionStorage.setItem('prank-2026-dismissed', '1')
    setStep(0)
  }

  if (step === 0) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-5"
      onClick={step === 2 ? dismiss : undefined}
    >
      {step === 1 && (
        <div
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-[fadeInScale_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-center text-4xl">😬</p>

          <div className="space-y-3 text-center">
            <h2 className="text-xl font-bold text-yvy-dark">Período de Testes Encerrado</h2>
            <p className="text-sm text-yvy-text leading-relaxed">
              Seu período de acesso gratuito chegou ao fim. Para continuar usando o YVY
              Figurinhas, é necessário cadastrar um cartão de crédito.
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-left">
              <p className="text-xs font-semibold text-yvy-dark uppercase tracking-wide">
                Tabela de preços — Conta Premium
              </p>
              <p className="text-sm text-yvy-text">
                💳 <span className="font-semibold">R$ 2,99</span> por figurinha adicionada ao
                álbum
              </p>
              <p className="text-sm text-yvy-text">
                🔄 <span className="font-semibold">R$ 4,99</span> por troca solicitada
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-3 rounded-2xl text-sm transition-colors"
          >
            Inserir Dados do Cartão
          </button>
        </div>
      )}

      {step === 2 && (
        <div
          className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-[fadeInScale_0.3s_ease-out]"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-center text-4xl">😂</p>

          <div className="space-y-2 text-center">
            <h2 className="text-xl font-bold text-yvy-dark">ERA BRINCADEIRA!</h2>
            <p className="text-sm text-yvy-text leading-relaxed">
              O time de desenvolvimento (eu) estava <em>offline</em> desde ontem num date e hoje
              volta pra trabalhar nas inconsistências do app. Desculpem o transtorno! 🫶
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden">
            <Image
              src="/prank-faixa.jpg"
              alt="Faixa da torcida: TIME DE FESTEIROS E VAGABUNDOS"
              width={400}
              height={200}
              className="w-full h-auto object-cover"
            />
          </div>

          <button
            onClick={dismiss}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-3 rounded-2xl text-sm transition-colors"
          >
            😂 Fechar
          </button>
        </div>
      )}
    </div>
  )
}

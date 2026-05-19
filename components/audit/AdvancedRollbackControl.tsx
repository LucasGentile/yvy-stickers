'use client'

import { useState, useEffect } from 'react'
import { rollbackAdvancedTrade } from '@/actions/rollbackAdvancedTrade'

const FORCE_DELAY_MS = 7 * 24 * 60 * 60 * 1000

export function AdvancedRollbackControl({ tradeId, userId }: { tradeId: string; userId: string }) {
  const [step, setStep] = useState<'closed' | 'confirming' | 'requested' | 'other-requested'>(
    'closed'
  )
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [requestedAt, setRequestedAt] = useState<string | null>(null)
  const [canForce, setCanForce] = useState(false)

  useEffect(() => {
    if (!requestedAt) return
    const check = () => {
      setCanForce(Date.now() - new Date(requestedAt).getTime() >= FORCE_DELAY_MS)
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [requestedAt])

  async function handleRequest() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'request')
    if (result.success) {
      setStep('requested')
      setRequestedAt(new Date().toISOString())
    } else {
      if (result.error === 'Desfazimento já solicitado.') {
        setStep('other-requested')
      }
      setMsg(result.error)
    }
    setLoading(false)
  }

  async function handleConfirm() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'confirm')
    if (result.success) {
      setStep('closed')
      setMsg('Desfazimento confirmado.')
    } else {
      setMsg(result.error)
    }
    setLoading(false)
  }

  async function handleDeny() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'deny')
    if (result.success) {
      setStep('closed')
      setMsg(null)
    } else {
      setMsg(result.error)
    }
    setLoading(false)
  }

  async function handleForce() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'force')
    if (result.success) {
      setStep('closed')
      setMsg('Desfazimento forçado com sucesso.')
    } else {
      setMsg(result.error)
    }
    setLoading(false)
  }

  if (step === 'closed') {
    return (
      <div className="mt-1.5 space-y-1">
        {msg && <p className="text-[11px] text-amber-700 font-medium">{msg}</p>}
        <button
          onClick={() => setStep('confirming')}
          className="text-[11px] text-amber-600 underline"
        >
          Desfazer troca
        </button>
      </div>
    )
  }

  if (step === 'confirming') {
    return (
      <div className="mt-1.5 space-y-2">
        <p className="text-[11px] text-yvy-muted">Solicitar desfazimento desta troca triangular?</p>
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setStep('closed')
              setMsg(null)
            }}
            disabled={loading}
            className="flex-1 border border-yvy-border text-yvy-text font-semibold py-1.5 rounded-lg text-xs transition-colors hover:bg-yvy-bg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleRequest}
            disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {loading ? 'Solicitando...' : 'Sim, desfazer'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'requested') {
    return (
      <div className="mt-1.5 space-y-1">
        <p className="text-[11px] text-amber-700 font-medium">
          Solicitação enviada — aguardando todos os participantes confirmarem.
        </p>
        {canForce && (
          <button
            onClick={handleForce}
            disabled={loading}
            className="text-[11px] text-amber-600 underline disabled:opacity-50"
          >
            {loading ? 'Forçando...' : 'Forçar desfazimento (7 dias sem resposta)'}
          </button>
        )}
      </div>
    )
  }

  // step === 'other-requested'
  return (
    <div className="mt-1.5 space-y-2">
      <p className="text-[11px] text-amber-700 font-medium">
        Um participante quer desfazer esta troca.
      </p>
      {msg && <p className="text-[11px] text-red-600">{msg}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleDeny}
          disabled={loading}
          className="flex-1 border border-yvy-border text-yvy-text font-semibold py-1.5 rounded-lg text-xs transition-colors hover:bg-yvy-bg disabled:opacity-50"
        >
          Manter troca
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
        >
          Confirmar desfazimento
        </button>
      </div>
    </div>
  )
}

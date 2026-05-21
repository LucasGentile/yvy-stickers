'use client'

import { useState, useEffect } from 'react'
import { rollbackAdvancedTrade } from '@/actions/rollbackAdvancedTrade'
import { getAdvancedTradeRollbackInfo } from '@/actions/getAdvancedTradeRollbackInfo'
import { useNotification } from '@/contexts/NotificationContext'

const FORCE_DELAY_MS = 7 * 24 * 60 * 60 * 1000

export function AdvancedRollbackControl({ tradeId, userId }: { tradeId: string; userId: string }) {
  const { showSuccess, showError } = useNotification()
  const [step, setStep] = useState<
    'closed' | 'loading-info' | 'confirming' | 'requested' | 'other-requested'
  >('closed')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [requestedAt, setRequestedAt] = useState<string | null>(null)
  const [canForce, setCanForce] = useState(false)
  const [confirmingForce, setConfirmingForce] = useState(false)

  useEffect(() => {
    if (!requestedAt) return
    const check = () => {
      setCanForce(Date.now() - new Date(requestedAt).getTime() >= FORCE_DELAY_MS)
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [requestedAt])

  async function open() {
    setStep('loading-info')
    setMsg(null)
    try {
      const info = await getAdvancedTradeRollbackInfo(tradeId, userId)
      if (!info.found) {
        setMsg('Troca não encontrada.')
        setStep('closed')
        return
      }
      if (info.alreadyRolledBack) {
        setMsg('Esta troca já foi desfeita.')
        setStep('closed')
        return
      }
      if (info.rollbackRequestedBy === userId) {
        setRequestedAt(info.rollbackRequestedAt)
        setStep('requested')
      } else if (info.rollbackRequestedBy !== null) {
        setStep('other-requested')
      } else {
        setStep('confirming')
      }
    } catch {
      setMsg('Erro ao verificar status da troca.')
      setStep('closed')
    }
  }

  async function handleRequest() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'request')
    if (result.success) {
      showSuccess('Solicitação de desfazimento enviada com sucesso!')
      setStep('requested')
      setRequestedAt(new Date().toISOString())
    } else {
      if (result.error === 'Desfazimento já solicitado.') {
        setStep('other-requested')
      }
      showError(`${result.error} Tente novamente ou procure ajuda.`)
    }
    setLoading(false)
  }

  async function handleConfirm() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'confirm')
    if (result.success) {
      showSuccess('Troca triangular desfeita com sucesso!')
      setStep('closed')
    } else {
      showError(`${result.error} Tente novamente ou procure ajuda.`)
    }
    setLoading(false)
  }

  async function handleDeny() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'deny')
    if (result.success) {
      showSuccess('Desfazimento recusado.')
      setStep('closed')
    } else {
      showError(`${result.error} Tente novamente ou procure ajuda.`)
    }
    setLoading(false)
  }

  async function handleForce() {
    setLoading(true)
    setMsg(null)
    const result = await rollbackAdvancedTrade(tradeId, userId, 'force')
    if (result.success) {
      showSuccess('Troca triangular desfeita com sucesso!')
      setStep('closed')
    } else {
      showError(`${result.error} Tente novamente ou procure ajuda.`)
    }
    setLoading(false)
    setConfirmingForce(false)
  }

  if (step === 'closed') {
    return (
      <div className="mt-1.5 space-y-1">
        {msg && <p className="text-[11px] text-amber-700 font-medium">{msg}</p>}
        <button onClick={open} className="text-[11px] text-amber-600 underline">
          Desfazer troca
        </button>
      </div>
    )
  }

  if (step === 'loading-info') {
    return <p className="text-[11px] text-yvy-muted mt-1.5">Verificando...</p>
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
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] text-amber-700 leading-snug">
              Já se passaram 7 dias sem resposta. Você pode forçar o desfazimento.
            </p>
            {confirmingForce ? (
              <div className="space-y-2">
                <p className="text-xs text-red-700 font-medium">
                  Tem certeza? Os álbuns de todos os participantes serão revertidos imediatamente.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmingForce(false)}
                    disabled={loading}
                    className="flex-1 border border-yvy-border text-yvy-text font-semibold py-1.5 rounded-lg text-xs transition-colors hover:bg-yvy-bg disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleForce}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Desfazendo...' : 'Confirmar desfazimento'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingForce(true)}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Forçar desfazimento
              </button>
            )}
          </div>
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

'use client'

import { useState } from 'react'
import { rollbackTrade } from '@/actions/rollbackTrade'
import { getTradeRollbackInfo } from '@/actions/getTradeRollbackInfo'
import { sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { useNotification } from '@/contexts/NotificationContext'
import { StickerChip } from '../StickerChip'

type RollbackStep =
  | 'closed'
  | 'loading-info'
  | 'choose-mode'
  | 'select-stickers'
  | 'requesting'
  | 'requested'
  | 'waiting'
  | 'confirm-other'

export function RollbackControl({
  tradeId,
  userId,
  partnerName,
  givingIds,
  receivingIds,
}: {
  tradeId: string
  userId: string
  partnerName: string
  givingIds: string[]
  receivingIds: string[]
}) {
  const { showSuccess, showError } = useNotification()
  const [step, setStep] = useState<RollbackStep>('closed')
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [isInitiator, setIsInitiator] = useState(true)
  const [selectedGiving, setSelectedGiving] = useState<Set<string>>(new Set())
  const [selectedReceiving, setSelectedReceiving] = useState<Set<string>>(new Set())
  const [pendingGiving, setPendingGiving] = useState<string[] | null>(null)
  const [pendingReceiving, setPendingReceiving] = useState<string[] | null>(null)

  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  async function open() {
    setStep('loading-info')
    setMsg(null)
    try {
      const info = await getTradeRollbackInfo(tradeId, userId)
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
      setIsInitiator(info.isInitiator)
      if (info.rollbackRequestedBy === userId) {
        setPendingGiving(info.rollbackMyGivingIds)
        setPendingReceiving(info.rollbackMyReceivingIds)
        setStep('waiting')
      } else if (info.rollbackRequestedBy !== null) {
        setPendingGiving(info.rollbackMyGivingIds)
        setPendingReceiving(info.rollbackMyReceivingIds)
        setStep('confirm-other')
      } else {
        setStep('choose-mode')
      }
    } catch {
      setMsg('Erro ao verificar status da troca.')
      setStep('closed')
    }
  }

  async function requestFull() {
    setSubmitting(true)
    setMsg(null)
    try {
      const result = await rollbackTrade(tradeId, userId, 'request')
      if (result.success) {
        showSuccess('Solicitação de desfazimento enviada com sucesso!')
        setStep('requested')
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado ao solicitar desfazimento. Tente novamente ou procure ajuda.')
    } finally {
      setSubmitting(false)
    }
  }

  async function requestPartial() {
    const pGiving = Array.from(selectedGiving)
    const pReceiving = Array.from(selectedReceiving)
    const tradePGiving = isInitiator ? pGiving : pReceiving
    const tradePReceiving = isInitiator ? pReceiving : pGiving
    setSubmitting(true)
    setMsg(null)
    try {
      const result = await rollbackTrade(tradeId, userId, 'request', tradePGiving, tradePReceiving)
      if (result.success) {
        showSuccess('Solicitação de desfazimento parcial enviada com sucesso!')
        setStep('requested')
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado ao solicitar desfazimento. Tente novamente ou procure ajuda.')
    } finally {
      setSubmitting(false)
    }
  }

  async function respond(action: 'confirm' | 'deny') {
    setSubmitting(true)
    setMsg(null)
    try {
      const result = await rollbackTrade(tradeId, userId, action)
      if (result.success) {
        if (action === 'confirm') {
          showSuccess('Troca desfeita com sucesso!')
        } else {
          showSuccess('Desfazimento recusado.')
        }
        setStep(action === 'deny' ? 'closed' : 'requested')
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado. Tente novamente ou procure ajuda.')
    } finally {
      setSubmitting(false)
    }
  }

  const sortedGiving = sort(givingIds)
  const sortedReceiving = sort(receivingIds)
  const hasSelection = selectedGiving.size > 0 || selectedReceiving.size > 0

  if (step === 'closed') {
    return (
      <div className="mt-1.5 space-y-1">
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <button onClick={open} className="text-[11px] text-amber-600 underline">
          Desfazer troca
        </button>
      </div>
    )
  }

  if (step === 'loading-info') {
    return <p className="text-[11px] text-yvy-muted mt-1.5">Verificando...</p>
  }

  if (step === 'requested') {
    return (
      <p className="text-[11px] text-amber-700 font-medium mt-1.5">
        Solicitação enviada — aguardando confirmação de {partnerName.split(' ')[0]}.
      </p>
    )
  }

  if (step === 'waiting') {
    const isPartial = pendingGiving !== null || pendingReceiving !== null
    return (
      <div className="mt-1.5 space-y-1.5">
        <p className="text-[11px] text-amber-700 font-medium">
          {isPartial
            ? 'Desfazimento parcial aguardando confirmação.'
            : 'Desfazimento aguardando confirmação.'}
        </p>
        {isPartial && pendingGiving && pendingGiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">
            Figurinhas que você deu: {sort(pendingGiving).join(', ')}
          </p>
        )}
        {isPartial && pendingReceiving && pendingReceiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">
            Figurinhas que você recebeu: {sort(pendingReceiving).join(', ')}
          </p>
        )}
      </div>
    )
  }

  if (step === 'confirm-other') {
    const isPartial = pendingGiving !== null || pendingReceiving !== null
    return (
      <div className="mt-1.5 space-y-2">
        <p className="text-[11px] text-amber-700 font-medium">
          {partnerName.split(' ')[0]} quer {isPartial ? 'desfazer parcialmente' : 'desfazer'} esta
          troca.
        </p>
        {isPartial && pendingGiving && pendingGiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">
            Você recuperará: {sort(pendingGiving).join(', ')}
          </p>
        )}
        {isPartial && pendingReceiving && pendingReceiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">
            Você devolverá: {sort(pendingReceiving).join(', ')}
          </p>
        )}
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => respond('deny')}
            disabled={submitting}
            className="flex-1 border border-yvy-border text-yvy-text font-semibold py-1.5 rounded-lg text-xs transition-colors hover:bg-yvy-bg disabled:opacity-50"
          >
            Manter troca
          </button>
          <button
            onClick={() => respond('confirm')}
            disabled={submitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {submitting ? 'Confirmando...' : 'Confirmar desfazimento'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'choose-mode') {
    return (
      <div className="mt-1.5 space-y-2">
        <p className="text-[11px] text-yvy-muted">Como deseja desfazer?</p>
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button
            onClick={requestFull}
            disabled={submitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {submitting ? 'Solicitando...' : 'Desfazer tudo'}
          </button>
          <button
            onClick={() => setStep('select-stickers')}
            className="flex-1 border border-amber-400 text-amber-700 font-semibold py-1.5 rounded-lg text-xs hover:bg-amber-50 transition-colors"
          >
            Desfazer parcialmente
          </button>
        </div>
        <button onClick={() => setStep('closed')} className="text-[11px] text-yvy-muted underline">
          Cancelar
        </button>
      </div>
    )
  }

  if (step === 'select-stickers') {
    return (
      <div className="mt-1.5 space-y-3">
        <p className="text-[11px] text-yvy-muted">Selecione as figurinhas que deseja desfazer:</p>
        {sortedGiving.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
              Você deu
            </p>
            <div className="flex flex-wrap gap-1">
              {sortedGiving.map((id) => (
                <StickerChip
                  key={id}
                  id={id}
                  selected={selectedGiving.has(id)}
                  onToggle={() =>
                    setSelectedGiving((p) => {
                      const n = new Set(p)
                      if (n.has(id)) n.delete(id)
                      else n.add(id)
                      return n
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
        {sortedReceiving.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
              Você recebeu
            </p>
            <div className="flex flex-wrap gap-1">
              {sortedReceiving.map((id) => (
                <StickerChip
                  key={id}
                  id={id}
                  selected={selectedReceiving.has(id)}
                  onToggle={() =>
                    setSelectedReceiving((p) => {
                      const n = new Set(p)
                      if (n.has(id)) n.delete(id)
                      else n.add(id)
                      return n
                    })
                  }
                />
              ))}
            </div>
          </div>
        )}
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => setStep('choose-mode')}
            className="border border-yvy-border text-yvy-text font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-yvy-bg transition-colors"
          >
            ← Voltar
          </button>
          <button
            onClick={requestPartial}
            disabled={!hasSelection || submitting}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {submitting ? 'Solicitando...' : 'Solicitar desfazimento'}
          </button>
        </div>
      </div>
    )
  }

  return null
}

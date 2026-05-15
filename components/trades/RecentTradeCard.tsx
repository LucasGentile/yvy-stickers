'use client'

import { useState } from 'react'
import type { RecentTrade } from '@/actions/getPendingTrades'
import { rollbackTrade } from '@/actions/rollbackTrade'
import { verifyTrade } from '@/actions/verifyTrade'
import { StickerList, StickerToggle } from './StickerList'
import { TradeAssistant } from '../audit/TradeAssistant'

type RevertStep = 'idle' | 'choose-mode' | 'select-stickers'

export function RecentTradeCard({
  trade,
  userId,
  onDone,
  hideRollback = false,
}: {
  trade: RecentTrade
  userId: string
  onDone: () => void
  hideRollback?: boolean
}) {
  const [loading, setLoading] = useState<'request' | 'confirm' | 'deny' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [revertStep, setRevertStep] = useState<RevertStep>('idle')
  const [selectedGiving, setSelectedGiving] = useState<Set<string>>(new Set())
  const [selectedReceiving, setSelectedReceiving] = useState<Set<string>>(new Set())
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [verified, setVerified] = useState(trade.verified)

  const iRequested = trade.rollbackRequestedBy === userId
  const otherRequested = trade.rollbackRequestedBy !== null && trade.rollbackRequestedBy !== userId

  const isPartialRequest =
    trade.rollbackMyGivingIds !== null || trade.rollbackMyReceivingIds !== null

  function toggleGiving(id: string) {
    setSelectedGiving((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleReceiving(id: string) {
    setSelectedReceiving((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handle(
    action: 'request' | 'confirm' | 'deny',
    pGiving?: string[],
    pReceiving?: string[]
  ) {
    setLoading(action)
    setMsg(null)
    try {
      const result = await rollbackTrade(trade.id, userId, action, pGiving, pReceiving)
      if (result.success) {
        setRevertStep('idle')
        onDone()
      } else {
        setMsg(result.error)
      }
    } catch {
      setMsg('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(null)
    }
  }

  function handleRequestFull() {
    handle('request')
  }

  function handleRequestPartial() {
    const pGiving = Array.from(selectedGiving)
    const pReceiving = Array.from(selectedReceiving)
    const tradePGiving = trade.isSender ? pGiving : pReceiving
    const tradePReceiving = trade.isSender ? pReceiving : pGiving
    handle('request', tradePGiving, tradePReceiving)
  }

  const hasPartialSelection = selectedGiving.size > 0 || selectedReceiving.size > 0

  return (
    <div className="bg-yvy-surface rounded-xl border border-amber-200 shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yvy-dark capitalize">{trade.otherUserName}</p>
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          {verified && <span className="text-emerald-500">✓</span>}
          Troca concluída
        </span>
      </div>

      <StickerList
        ids={trade.myReceivingIds}
        label={`Você recebeu ${trade.myReceivingIds.length}`}
        variant="receiving"
      />
      <StickerList
        ids={trade.myGivingIds}
        label={`Você deu ${trade.myGivingIds.length}`}
        variant="giving"
      />

      <button
        onClick={() => setAssistantOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
      >
        <span>📋</span>
        Assistente de troca
      </button>

      {assistantOpen && (
        <TradeAssistant
          partnerName={trade.otherUserName}
          givingIds={trade.myGivingIds}
          receivingIds={trade.myReceivingIds}
          onClose={() => setAssistantOpen(false)}
          onVerify={
            verified
              ? undefined
              : async () => {
                  const result = await verifyTrade(trade.id, userId, 'normal')
                  if (result.success) {
                    setVerified(true)
                  } else {
                    throw new Error(result.error)
                  }
                }
          }
        />
      )}

      {msg && <p className="text-xs text-red-600">{msg}</p>}

      {iRequested && (
        <div className="space-y-1.5 pt-0.5">
          <p className="text-xs text-yvy-muted">
            {isPartialRequest
              ? `Aguardando confirmação de ${trade.otherUserName} para desfazer parcialmente:`
              : `Aguardando confirmação de ${trade.otherUserName} para desfazer toda a troca.`}
          </p>
          {isPartialRequest && (
            <div className="space-y-1.5">
              {trade.rollbackMyGivingIds && trade.rollbackMyGivingIds.length > 0 && (
                <StickerList ids={trade.rollbackMyGivingIds} label="Das figurinhas que você deu" />
              )}
              {trade.rollbackMyReceivingIds && trade.rollbackMyReceivingIds.length > 0 && (
                <StickerList
                  ids={trade.rollbackMyReceivingIds}
                  label="Das figurinhas que você recebeu"
                />
              )}
            </div>
          )}
        </div>
      )}

      {otherRequested && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-medium">
            {isPartialRequest
              ? `${trade.otherUserName} quer desfazer parcialmente esta troca:`
              : `${trade.otherUserName} quer desfazer toda esta troca.`}
          </p>
          {isPartialRequest && (
            <div className="space-y-1.5">
              {trade.rollbackMyGivingIds && trade.rollbackMyGivingIds.length > 0 && (
                <StickerList ids={trade.rollbackMyGivingIds} label="Você recuperará" />
              )}
              {trade.rollbackMyReceivingIds && trade.rollbackMyReceivingIds.length > 0 && (
                <StickerList ids={trade.rollbackMyReceivingIds} label="Você devolverá" />
              )}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handle('deny')}
              disabled={loading !== null}
              className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
            >
              {loading === 'deny' ? '...' : 'Manter troca'}
            </button>
            <button
              onClick={() => handle('confirm')}
              disabled={loading !== null}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading === 'confirm' ? 'Desfazendo...' : 'Confirmar desfazimento'}
            </button>
          </div>
        </div>
      )}

      {!hideRollback && !trade.rollbackRequestedBy && revertStep === 'idle' && (
        <button
          onClick={() => setRevertStep('choose-mode')}
          disabled={loading !== null}
          className="text-xs text-amber-600 underline disabled:opacity-50"
        >
          Desfazer troca
        </button>
      )}

      {!hideRollback && !trade.rollbackRequestedBy && revertStep === 'choose-mode' && (
        <div className="space-y-2 pt-0.5">
          <p className="text-xs font-medium text-yvy-dark">Como deseja desfazer?</p>
          <div className="flex gap-2">
            <button
              onClick={handleRequestFull}
              disabled={loading !== null}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading === 'request' ? 'Solicitando...' : 'Desfazer tudo'}
            </button>
            <button
              onClick={() => setRevertStep('select-stickers')}
              disabled={loading !== null}
              className="flex-1 border border-amber-400 text-amber-700 font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-amber-50 disabled:opacity-50"
            >
              Desfazer parcialmente
            </button>
          </div>
          <button
            onClick={() => setRevertStep('idle')}
            disabled={loading !== null}
            className="text-xs text-yvy-muted underline"
          >
            Cancelar
          </button>
        </div>
      )}

      {!hideRollback && !trade.rollbackRequestedBy && revertStep === 'select-stickers' && (
        <div className="space-y-3 pt-0.5">
          <p className="text-xs text-yvy-muted">Selecione as figurinhas que deseja desfazer:</p>
          <StickerToggle
            ids={trade.myGivingIds}
            label="Você deu"
            selected={selectedGiving}
            onToggle={toggleGiving}
          />
          <StickerToggle
            ids={trade.myReceivingIds}
            label="Você recebeu"
            selected={selectedReceiving}
            onToggle={toggleReceiving}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setRevertStep('choose-mode')}
              disabled={loading !== null}
              className="border border-yvy-border text-yvy-text font-semibold px-4 py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
            >
              ← Voltar
            </button>
            <button
              onClick={handleRequestPartial}
              disabled={loading !== null || !hasPartialSelection}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading === 'request' ? 'Solicitando...' : 'Solicitar desfazimento'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

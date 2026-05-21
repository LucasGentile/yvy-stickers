'use client'

import { useState, useEffect } from 'react'
import type { PendingTrade } from '@/actions/getPendingTrades'
import { respondToTrade } from '@/actions/respondToTrade'
import {
  getBetterMatchExcludingTrade,
  type BetterMatchResult,
} from '@/actions/getBetterMatchExcludingTrade'
import { getTradeAvailability, type TradeAvailability } from '@/actions/getTradeAvailability'
import {
  checkAlreadyOwnedIncoming,
  type AlreadyOwnedResult,
} from '@/actions/checkAlreadyOwnedIncoming'
import { useNotification } from '@/contexts/NotificationContext'
import { StickerList, StickerToggle } from './StickerList'
import { AlreadyOwnedWarningModal } from './AlreadyOwnedWarningModal'
import { relativeTime, absoluteTime } from '../audit/eventConfig'

export function TradeCard({
  trade,
  userId,
  onDone,
}: {
  trade: PendingTrade
  userId: string
  onDone: () => void
}) {
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState<'accept' | 'reject' | 'cancel' | null>(null)
  const [betterMatch, setBetterMatch] = useState<BetterMatchResult | null | undefined>(undefined)
  const [confirming, setConfirming] = useState<'accept' | 'reject' | 'cancel' | null>(null)
  const [preAcceptHint, setPreAcceptHint] = useState(false)
  const [availability, setAvailability] = useState<TradeAvailability | 'loading' | null>(null)
  const [selectedMyGiving, setSelectedMyGiving] = useState<Set<string>>(new Set())
  const [selectedMyReceiving, setSelectedMyReceiving] = useState<Set<string>>(new Set())
  const [pendingRemoval, setPendingRemoval] = useState<{
    id: string
    side: 'giving' | 'receiving'
  } | null>(null)
  const [alreadyOwned, setAlreadyOwned] = useState<AlreadyOwnedResult>({
    myAlreadyOwned: [],
    theirAlreadyOwned: [],
  })
  const [showAlreadyOwnedModal, setShowAlreadyOwnedModal] = useState(false)
  const [modalLoading, setModalLoading] = useState<'confirm' | 'reject' | null>(null)

  const totalReceiving = trade.myReceivingIds.length
  const totalGiving = trade.myGivingIds.length
  const tradeMutual = Math.min(totalReceiving, totalGiving)

  useEffect(() => {
    if (trade.isSender) return
    getBetterMatchExcludingTrade(userId, trade.id, trade.otherUserId, tradeMutual)
      .then(setBetterMatch)
      .catch(() => setBetterMatch(null))
  }, [trade.id])

  useEffect(() => {
    if (trade.myReceivingIds.length === 0 && trade.myGivingIds.length === 0) return
    checkAlreadyOwnedIncoming(userId, trade.otherUserId, trade.myReceivingIds, trade.myGivingIds)
      .then(setAlreadyOwned)
      .catch(() => setAlreadyOwned({ myAlreadyOwned: [], theirAlreadyOwned: [] }))
  }, [userId, trade.otherUserId, trade.myReceivingIds, trade.myGivingIds])

  const actionLabels = {
    accept: 'Troca aceita com sucesso!',
    reject: 'Troca recusada.',
    cancel: 'Pedido de troca cancelado.',
  } as const

  async function handle(action: 'accept' | 'reject' | 'cancel') {
    setLoading(action)
    try {
      const result = await respondToTrade(trade.id, userId, action)
      if (result.success) {
        showSuccess(actionLabels[action])
        onDone()
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado. Tente novamente ou procure ajuda.')
    } finally {
      setLoading(null)
    }
  }

  async function handleConfirmAccept() {
    setLoading('accept')
    try {
      const result = await respondToTrade(
        trade.id,
        userId,
        'accept',
        [...selectedMyGiving],
        [...selectedMyReceiving]
      )
      if (result.success) {
        showSuccess('Troca aceita com sucesso!')
        onDone()
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado. Tente novamente ou procure ajuda.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yvy-dark capitalize">{trade.otherUserName}</p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-1">
            <span className="text-[10px] text-yvy-muted">{relativeTime(trade.createdAt)}</span>
            <span className="text-[10px] text-yvy-muted/60">{absoluteTime(trade.createdAt)}</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted">
            {trade.isSender ? 'Aguardando resposta' : 'Pedido recebido'}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-yvy-muted">
        {totalReceiving > 0 && totalGiving > 0
          ? `${totalReceiving + totalGiving} figurinhas — ${totalReceiving} você recebe · ${totalGiving} você dá`
          : totalReceiving > 0
            ? `${totalReceiving} figurinha${totalReceiving !== 1 ? 's' : ''} você recebe`
            : `${totalGiving} figurinha${totalGiving !== 1 ? 's' : ''} você dá`}
      </p>

      <StickerList
        ids={trade.myReceivingIds}
        label="Você vai receber"
        variant="receiving"
        alreadyOwnedIds={
          alreadyOwned.myAlreadyOwned.length > 0 ? new Set(alreadyOwned.myAlreadyOwned) : undefined
        }
      />
      <StickerList
        ids={trade.myGivingIds}
        label="Você vai dar"
        variant="giving"
        alreadyOwnedIds={
          alreadyOwned.theirAlreadyOwned.length > 0
            ? new Set(alreadyOwned.theirAlreadyOwned)
            : undefined
        }
      />

      {!trade.isSender && betterMatch && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm shrink-0 mt-px">⚠️</span>
          <p className="text-[11px] text-amber-800 leading-snug">
            <strong className="capitalize">{betterMatch.name.split(' ')[0]}</strong> tem uma troca
            mais equilibrada disponível para você no ranking ({betterMatch.mutualScore} figurinhas
            mútuas). Considere antes de aceitar.
          </p>
        </div>
      )}

      {trade.isSender ? (
        confirming === 'cancel' ? (
          <div className="flex items-center gap-2 pt-0.5">
            <p className="text-xs text-yvy-muted flex-1">Cancelar o pedido?</p>
            <button
              onClick={() => setConfirming(null)}
              disabled={loading !== null}
              className="text-xs text-yvy-muted underline disabled:opacity-50"
            >
              Não
            </button>
            <button
              onClick={() => {
                setConfirming(null)
                handle('cancel')
              }}
              disabled={loading !== null}
              className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
            >
              {loading === 'cancel' ? 'Cancelando...' : 'Sim, cancelar'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming('cancel')}
            disabled={loading !== null}
            className="text-xs text-yvy-muted underline disabled:opacity-50"
          >
            Cancelar pedido
          </button>
        )
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-yvy-muted leading-snug">
            💡 Antes de aceitar, confirme presencialmente com {trade.otherUserName.split(' ')[0]} se
            as figurinhas estão disponíveis. As figurinhas desta troca já estão reservadas e não
            aparecem em novas sugestões de troca.
          </p>

          {confirming === 'reject' ? (
            <div className="flex items-center gap-2">
              <p className="text-xs text-yvy-muted flex-1">Recusar esta troca?</p>
              <button
                onClick={() => setConfirming(null)}
                disabled={loading !== null}
                className="text-xs text-yvy-muted underline disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setConfirming(null)
                  handle('reject')
                }}
                disabled={loading !== null}
                className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
              >
                {loading === 'reject' ? '...' : 'Sim, recusar'}
              </button>
            </div>
          ) : preAcceptHint ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <span className="text-blue-500 text-sm shrink-0 mt-px">ℹ️</span>
                <div className="space-y-1">
                  <p className="text-[12px] font-semibold text-blue-900">
                    Antes de aceitar, confira:
                  </p>
                  <ul className="text-[11px] text-blue-800 leading-snug space-y-1 list-disc list-inside">
                    <li>Você tem todas as figurinhas que vai dar em mãos?</li>
                    <li>A outra pessoa também confirmou que tem as figurinhas dela?</li>
                    <li>
                      Se alguma não estiver disponível agora, use a <strong>seleção parcial</strong>{' '}
                      na próxima tela para incluir só as que vocês têm.
                    </li>
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreAcceptHint(false)}
                  className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg"
                >
                  Voltar
                </button>
                <button
                  onClick={() => {
                    setPreAcceptHint(false)
                    setConfirming('accept')
                    setAvailability('loading')
                    getTradeAvailability(trade.id, userId).then((av) => {
                      setAvailability(av)
                      setSelectedMyGiving(new Set(av?.myGivingAvailable ?? []))
                      setSelectedMyReceiving(new Set(av?.theirGivingAvailable ?? []))
                    })
                  }}
                  className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2 rounded-xl text-sm transition-colors"
                >
                  Revisei, continuar
                </button>
              </div>
            </div>
          ) : confirming === 'accept' ? (
            <div className="space-y-3">
              {availability === 'loading' && (
                <p className="text-xs text-yvy-muted">Verificando disponibilidade…</p>
              )}

              {availability !== 'loading' && availability !== null && (
                <>
                  {(availability.myGivingUnavailable.length > 0 ||
                    availability.theirGivingUnavailable.length > 0) && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <span className="text-amber-500 text-sm shrink-0 mt-px">⚠️</span>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        {availability.myGivingUnavailable.length +
                          availability.theirGivingUnavailable.length}{' '}
                        figurinha(s) não disponível(eis) — verifique com{' '}
                        {trade.otherUserName.split(' ')[0]} antes de confirmar.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <StickerToggle
                      ids={availability.myGivingAvailable}
                      label="Você vai dar"
                      selected={selectedMyGiving}
                      onToggle={(id) => {
                        if (selectedMyGiving.has(id)) {
                          setPendingRemoval({ id, side: 'giving' })
                        } else {
                          setPendingRemoval(null)
                          setSelectedMyGiving((prev) => new Set([...prev, id]))
                        }
                      }}
                    />
                    {availability.myGivingUnavailable.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
                          Você vai dar{' '}
                          <span className="text-amber-600 normal-case font-medium">
                            · indisponíveis
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {availability.myGivingUnavailable.map((id) => (
                            <span
                              key={id}
                              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-bg border border-yvy-border text-yvy-text line-through opacity-50"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <StickerToggle
                      ids={availability.theirGivingAvailable}
                      label="Você vai receber"
                      selected={selectedMyReceiving}
                      onToggle={(id) => {
                        if (selectedMyReceiving.has(id)) {
                          setPendingRemoval({ id, side: 'receiving' })
                        } else {
                          setPendingRemoval(null)
                          setSelectedMyReceiving((prev) => new Set([...prev, id]))
                        }
                      }}
                    />
                    {availability.theirGivingUnavailable.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
                          Você vai receber{' '}
                          <span className="text-amber-600 normal-case font-medium">
                            · indisponíveis
                          </span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {availability.theirGivingUnavailable.map((id) => (
                            <span
                              key={id}
                              className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-bg border border-yvy-border text-yvy-text line-through opacity-50"
                            >
                              {id}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {pendingRemoval && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-[11px] text-amber-800 flex-1">
                        Remover <span className="font-bold font-mono">{pendingRemoval.id}</span> da
                        troca?
                      </p>
                      <button
                        onClick={() => setPendingRemoval(null)}
                        className="text-[11px] font-medium text-yvy-muted underline"
                      >
                        Não
                      </button>
                      <button
                        onClick={() => {
                          if (pendingRemoval.side === 'giving') {
                            setSelectedMyGiving((prev) => {
                              const next = new Set(prev)
                              next.delete(pendingRemoval.id)
                              return next
                            })
                          } else {
                            setSelectedMyReceiving((prev) => {
                              const next = new Set(prev)
                              next.delete(pendingRemoval.id)
                              return next
                            })
                          }
                          setPendingRemoval(null)
                        }}
                        className="text-[11px] font-semibold text-amber-700 underline"
                      >
                        Sim, remover
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setConfirming(null)
                        setAvailability(null)
                        setPendingRemoval(null)
                      }}
                      disabled={loading !== null}
                      className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        if (
                          alreadyOwned.myAlreadyOwned.length > 0 ||
                          alreadyOwned.theirAlreadyOwned.length > 0
                        ) {
                          setShowAlreadyOwnedModal(true)
                          return
                        }
                        handleConfirmAccept()
                      }}
                      disabled={
                        loading !== null ||
                        pendingRemoval !== null ||
                        selectedMyGiving.size + selectedMyReceiving.size === 0 ||
                        (selectedMyGiving.size === 0 && trade.myGivingIds.length > 0) ||
                        (selectedMyReceiving.size === 0 && trade.myReceivingIds.length > 0)
                      }
                      className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {loading === 'accept'
                        ? 'Aceitando...'
                        : `Confirmar troca (${selectedMyGiving.size + selectedMyReceiving.size} figurinha${selectedMyGiving.size + selectedMyReceiving.size !== 1 ? 's' : ''})`}
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming('reject')}
                disabled={loading !== null}
                className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
              >
                Recusar
              </button>
              <button
                onClick={() => setPreAcceptHint(true)}
                disabled={loading !== null}
                className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                Aceitar troca
              </button>
            </div>
          )}
        </div>
      )}

      <AlreadyOwnedWarningModal
        open={showAlreadyOwnedModal}
        myAlreadyOwnedIds={alreadyOwned.myAlreadyOwned}
        theirAlreadyOwnedIds={alreadyOwned.theirAlreadyOwned}
        otherUserName={trade.otherUserName}
        loading={modalLoading}
        onConfirm={async () => {
          setModalLoading('confirm')
          setShowAlreadyOwnedModal(false)
          setModalLoading(null)
          await handleConfirmAccept()
        }}
        onReject={async () => {
          setModalLoading('reject')
          setShowAlreadyOwnedModal(false)
          setModalLoading(null)
          await handle('reject')
        }}
        onDismiss={() => setShowAlreadyOwnedModal(false)}
      />
    </div>
  )
}

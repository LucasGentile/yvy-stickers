'use client'

import { useState, useEffect } from 'react'
import type { PendingTrade, RecentTrade } from '@/actions/getPendingTrades'
import { respondToTrade } from '@/actions/respondToTrade'
import { rollbackTrade } from '@/actions/rollbackTrade'
import { getBetterMatchExcludingTrade, type BetterMatchResult } from '@/actions/getBetterMatchExcludingTrade'
import { isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

function StickerList({ ids, label }: { ids: string[]; label: string }) {
  if (ids.length === 0) return null
  const chromeCount = ids.filter(isChromeSticker).length
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
        {label}
        {chromeCount > 0 && (
          <span className="ml-1.5 text-amber-600 normal-case font-medium">
            · ✨ {chromeCount} cromada{chromeCount !== 1 ? 's' : ''}
          </span>
        )}
      </p>
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => (
          <span
            key={id}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-bg border border-yvy-border text-yvy-text"
          >
            {isChromeSticker(id) ? <span className="font-bold text-amber-500">{id}</span> : isCocaColaSticker(id) ? <span className="font-bold text-red-500">{id}</span> : id}
          </span>
        ))}
      </div>
    </div>
  )
}

function StickerToggle({
  ids,
  label,
  selected,
  onToggle,
}: {
  ids: string[]
  label: string
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  if (ids.length === 0) return null
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {ids.map((id) => {
          const isSelected = selected.has(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
                isSelected
                  ? 'bg-amber-500 border-amber-500 text-white font-semibold'
                  : 'bg-yvy-bg border-yvy-border text-yvy-text hover:border-amber-400'
              }`}
            >
              {isChromeSticker(id) ? (
                <span className={isSelected ? 'text-white' : 'text-amber-500'}>{id}</span>
              ) : isCocaColaSticker(id) ? (
                <span className={isSelected ? 'text-white' : 'text-red-500'}>{id}</span>
              ) : id}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TradeCard({
  trade,
  userId,
  onDone,
}: {
  trade: PendingTrade
  userId: string
  onDone: () => void
}) {
  const [loading, setLoading] = useState<'accept' | 'reject' | 'cancel' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [betterMatch, setBetterMatch] = useState<BetterMatchResult | null | undefined>(undefined)

  const totalReceiving = trade.myReceivingIds.length
  const totalGiving = trade.myGivingIds.length
  const tradeMutual = Math.min(totalReceiving, totalGiving)

  useEffect(() => {
    if (trade.isSender) return
    getBetterMatchExcludingTrade(userId, trade.id, trade.otherUserId, tradeMutual)
      .then(setBetterMatch)
      .catch(() => setBetterMatch(null))
  }, [trade.id])

  async function handle(action: 'accept' | 'reject' | 'cancel') {
    setLoading(action)
    try {
      const result = await respondToTrade(trade.id, userId, action)
      if (result.success) {
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

  return (
    <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yvy-dark capitalize">{trade.otherUserName}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted">
          {trade.isSender ? 'Aguardando resposta' : 'Pedido recebido'}
        </span>
      </div>

      <p className="text-[11px] text-yvy-muted">
        {totalReceiving > 0 && totalGiving > 0
          ? `${totalReceiving + totalGiving} figurinhas — ${totalReceiving} você recebe · ${totalGiving} você dá`
          : totalReceiving > 0
            ? `${totalReceiving} figurinha${totalReceiving !== 1 ? 's' : ''} você recebe`
            : `${totalGiving} figurinha${totalGiving !== 1 ? 's' : ''} você dá`}
      </p>

      <StickerList ids={trade.myReceivingIds} label="Você vai receber" />
      <StickerList ids={trade.myGivingIds} label="Você vai dar" />

      {!trade.isSender && betterMatch && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm shrink-0 mt-px">⚠️</span>
          <p className="text-[11px] text-amber-800 leading-snug">
            <strong className="capitalize">{betterMatch.name.split(' ')[0]}</strong> tem uma troca mais equilibrada disponível para você no ranking ({betterMatch.mutualScore} figurinhas mútuas). Considere antes de aceitar.
          </p>
        </div>
      )}

      {msg && <p className="text-xs text-red-600">{msg}</p>}

      {trade.isSender ? (
        <button
          onClick={() => handle('cancel')}
          disabled={loading !== null}
          className="text-xs text-yvy-muted underline disabled:opacity-50"
        >
          {loading === 'cancel' ? 'Cancelando...' : 'Cancelar pedido'}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-yvy-muted leading-snug">
            💡 Antes de aceitar, confirme presencialmente com {trade.otherUserName.split(' ')[0]} se as figurinhas estão disponíveis. As figurinhas desta troca já estão reservadas e não aparecem em novas sugestões de troca.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handle('reject')}
              disabled={loading !== null}
              className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
            >
              {loading === 'reject' ? '...' : 'Recusar'}
            </button>
            <button
              onClick={() => handle('accept')}
              disabled={loading !== null}
              className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              {loading === 'accept' ? 'Aceitando...' : 'Aceitar troca'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type RevertStep = 'idle' | 'choose-mode' | 'select-stickers'

function RecentTradeCard({
  trade,
  userId,
  onDone,
}: {
  trade: RecentTrade
  userId: string
  onDone: () => void
}) {
  const [loading, setLoading] = useState<'request' | 'confirm' | 'deny' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [revertStep, setRevertStep] = useState<RevertStep>('idle')
  const [selectedGiving, setSelectedGiving] = useState<Set<string>>(new Set())
  const [selectedReceiving, setSelectedReceiving] = useState<Set<string>>(new Set())

  const iRequested = trade.rollbackRequestedBy === userId
  const otherRequested = trade.rollbackRequestedBy !== null && trade.rollbackRequestedBy !== userId

  // Is the pending request a partial revert?
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

  async function handle(action: 'request' | 'confirm' | 'deny', pGiving?: string[], pReceiving?: string[]) {
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
    // Translate from my perspective to initiator's perspective
    const tradePGiving = trade.isSender ? pGiving : pReceiving
    const tradePReceiving = trade.isSender ? pReceiving : pGiving
    handle('request', tradePGiving, tradePReceiving)
  }

  const hasPartialSelection = selectedGiving.size > 0 || selectedReceiving.size > 0

  return (
    <div className="bg-yvy-surface rounded-xl border border-amber-200 shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yvy-dark capitalize">{trade.otherUserName}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
          Troca concluída
        </span>
      </div>

      <StickerList ids={trade.myReceivingIds} label="Você recebeu" />
      <StickerList ids={trade.myGivingIds} label="Você deu" />

      {msg && <p className="text-xs text-red-600">{msg}</p>}

      {/* ── Requester waiting state ── */}
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
                <StickerList ids={trade.rollbackMyReceivingIds} label="Das figurinhas que você recebeu" />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Other party requested ── */}
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

      {/* ── No revert requested yet ── */}
      {!trade.rollbackRequestedBy && revertStep === 'idle' && (
        <button
          onClick={() => setRevertStep('choose-mode')}
          disabled={loading !== null}
          className="text-xs text-amber-600 underline disabled:opacity-50"
        >
          Desfazer troca
        </button>
      )}

      {/* ── Choose: full or partial ── */}
      {!trade.rollbackRequestedBy && revertStep === 'choose-mode' && (
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

      {/* ── Sticker picker for partial revert ── */}
      {!trade.rollbackRequestedBy && revertStep === 'select-stickers' && (
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

interface Props {
  received: PendingTrade[]
  sent: PendingTrade[]
  recentlyAccepted: RecentTrade[]
  userId: string
  onRefresh: () => void
}

export default function PendingTradesSection({
  received,
  sent,
  recentlyAccepted,
  userId,
  onRefresh,
}: Props) {
  const total = received.length + sent.length
  if (total === 0 && recentlyAccepted.length === 0) return null

  return (
    <div className="space-y-3">
      {total > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-yvy-dark">Pedidos pendentes</h3>
            <span className="bg-yvy-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {total}
            </span>
          </div>

          {received.length > 0 && (
            <div className="space-y-2">
              {received.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}
            </div>
          )}

          {sent.length > 0 && (
            <div className="space-y-2">
              {sent.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}
            </div>
          )}
        </>
      )}

      {recentlyAccepted.length > 0 && (
        <>
          <h3 className="text-base font-bold text-yvy-dark">Trocas concluídas</h3>
          <div className="space-y-2">
            {recentlyAccepted.map((t) => (
              <RecentTradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
            ))}
          </div>
        </>
      )}

      <hr className="border-yvy-border" />
    </div>
  )
}

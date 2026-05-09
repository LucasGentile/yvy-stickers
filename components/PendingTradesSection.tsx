'use client'

import { useState } from 'react'
import type { PendingTrade, RecentTrade } from '@/actions/getPendingTrades'
import type { MatchResult } from '@/lib/matching'
import { respondToTrade } from '@/actions/respondToTrade'
import { rollbackTrade } from '@/actions/rollbackTrade'
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

function TradeCard({
  trade,
  userId,
  matches,
  onDone,
}: {
  trade: PendingTrade
  userId: string
  matches?: MatchResult[]
  onDone: () => void
}) {
  const [loading, setLoading] = useState<'accept' | 'reject' | 'cancel' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

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

  const totalReceiving = trade.myReceivingIds.length
  const totalGiving = trade.myGivingIds.length
  const tradeMutual = Math.min(totalReceiving, totalGiving)
  const betterMatch = matches
    ?.filter((m) => m.userId !== trade.otherUserId && m.mutualScore > tradeMutual)
    .at(0)

  return (
    <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-yvy-dark capitalize">{trade.otherUserName}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted">
          {trade.isSender ? 'Aguardando resposta' : 'Pedido recebido'}
        </span>
      </div>

      {/* Sticker count summary */}
      <p className="text-[11px] text-yvy-muted">
        {totalReceiving > 0 && totalGiving > 0
          ? `${totalReceiving + totalGiving} figurinhas — ${totalReceiving} você recebe · ${totalGiving} você dá`
          : totalReceiving > 0
            ? `${totalReceiving} figurinha${totalReceiving !== 1 ? 's' : ''} você recebe`
            : `${totalGiving} figurinha${totalGiving !== 1 ? 's' : ''} você dá`}
      </p>

      <StickerList ids={trade.myReceivingIds} label="Você vai receber" />
      <StickerList ids={trade.myGivingIds} label="Você vai dar" />

      {/* Better match alert — only shown to the receiver */}
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
        <div className="flex gap-2 pt-1">
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
      )}
    </div>
  )
}

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

  const iRequested = trade.rollbackRequestedBy === userId
  const otherRequested =
    trade.rollbackRequestedBy !== null && trade.rollbackRequestedBy !== userId

  async function handle(action: 'request' | 'confirm' | 'deny') {
    setLoading(action)
    setMsg(null)
    try {
      const result = await rollbackTrade(trade.id, userId, action)
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

      {iRequested && (
        <p className="text-xs text-yvy-muted">
          Aguardando confirmação de {trade.otherUserName} para desfazer.
        </p>
      )}

      {otherRequested && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-medium">
            {trade.otherUserName} quer desfazer esta troca.
          </p>
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

      {!trade.rollbackRequestedBy && (
        <button
          onClick={() => handle('request')}
          disabled={loading !== null}
          className="text-xs text-amber-600 underline disabled:opacity-50"
        >
          {loading === 'request' ? 'Solicitando...' : 'Desfazer troca'}
        </button>
      )}
    </div>
  )
}

interface Props {
  received: PendingTrade[]
  sent: PendingTrade[]
  recentlyAccepted: RecentTrade[]
  userId: string
  matches?: MatchResult[]
  onRefresh: () => void
}

export default function PendingTradesSection({
  received,
  sent,
  recentlyAccepted,
  userId,
  matches,
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
                <TradeCard key={t.id} trade={t} userId={userId} matches={matches} onDone={onRefresh} />
              ))}
            </div>
          )}

          {sent.length > 0 && (
            <div className="space-y-2">
              {sent.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} matches={matches} onDone={onRefresh} />
              ))}
            </div>
          )}
        </>
      )}

      {recentlyAccepted.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-yvy-dark">Trocas recentes</h3>
            <span className="text-[10px] text-yvy-muted">(desfazível em 10 min)</span>
          </div>
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

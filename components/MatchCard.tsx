'use client'

import { useState } from 'react'
import type { MatchResult } from '@/lib/matching'
import { createTradeRequest } from '@/actions/createTradeRequest'
import { isChromeSticker, isCocaColaSticker } from '@/lib/stickers'

function StickerChip({
  id,
  selected,
  onToggle,
}: {
  id: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${
        selected
          ? 'bg-yvy-dark text-white border-yvy-dark'
          : 'bg-yvy-bg text-yvy-text border-yvy-border hover:border-yvy-dark'
      }`}
    >
      {isChromeSticker(id) ? (
        <span className="font-bold text-amber-400">{id}</span>
      ) : isCocaColaSticker(id) ? (
        <span className="font-bold text-red-500">{id}</span>
      ) : (
        id
      )}
    </button>
  )
}

function DetailModal({
  match,
  onClose,
  onTradeCreated,
}: {
  match: MatchResult
  onClose: () => void
  onTradeCreated?: () => void
}) {
  const [receiving, setReceiving] = useState<Set<string>>(new Set())
  const [giving, setGiving] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [trading, setTrading] = useState(false)
  const [tradeMsg, setTradeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function handleTrade() {
    const currentUserId = localStorage.getItem('userId')
    if (!currentUserId) return
    setTrading(true)
    setTradeMsg(null)
    try {
      const result = await createTradeRequest(
        currentUserId,
        match.userId,
        [...giving],
        [...receiving]
      )
      if (result.success) {
        setTradeMsg({
          ok: true,
          text: `Pedido enviado para ${match.name.split(' ')[0]}! Ele/ela verá na tela de Trocas.`,
        })
        setReceiving(new Set())
        setGiving(new Set())
        setConfirming(false)
        onTradeCreated?.()
      } else {
        setTradeMsg({ ok: false, text: result.error })
      }
    } catch {
      setTradeMsg({ ok: false, text: 'Erro inesperado. Tente novamente.' })
    } finally {
      setTrading(false)
    }
  }

  const canTrade = receiving.size > 0 || giving.size > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-yvy-surface rounded-2xl shadow-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-yvy-dark capitalize">{match.name}</p>
          <button onClick={onClose} className="text-yvy-muted text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Confirmation screen */}
        {confirming ? (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-yvy-dark">Confirmar a troca abaixo?</p>

            {receiving.size > 0 && (
              <div className="bg-yvy-bg rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1.5">
                  Você vai receber de {match.name.split(' ')[0]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {[...receiving].map((id) => (
                    <span
                      key={id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-dark text-white"
                    >
                      {isChromeSticker(id) ? (
                        <span className="font-bold text-amber-400">{id}</span>
                      ) : isCocaColaSticker(id) ? (
                        <span className="font-bold text-red-500">{id}</span>
                      ) : (
                        id
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {giving.size > 0 && (
              <div className="bg-yvy-bg rounded-lg p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1.5">
                  Você vai dar para {match.name.split(' ')[0]}
                </p>
                <div className="flex flex-wrap gap-1">
                  {[...giving].map((id) => (
                    <span
                      key={id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-yvy-border text-yvy-text"
                    >
                      {isChromeSticker(id) ? (
                        <span className="font-bold text-amber-400">{id}</span>
                      ) : isCocaColaSticker(id) ? (
                        <span className="font-bold text-red-500">{id}</span>
                      ) : (
                        id
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-yvy-muted">
              Os álbuns de ambos serão atualizados automaticamente. Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={trading}
                className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2.5 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={handleTrade}
                disabled={trading}
                className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
              >
                {trading ? 'Enviando...' : 'Enviar pedido de troca'}
              </button>
            </div>

            {tradeMsg && (
              <p className={`text-sm ${tradeMsg.ok ? 'text-yvy-dark' : 'text-red-600'}`}>
                {tradeMsg.text}
              </p>
            )}
          </div>
        ) : (
          <>
            {match.matchStickers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted">
                    Ele/ela tem para mim — toque para selecionar ({receiving.size}/
                    {match.matchStickers.length})
                  </p>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {receiving.size < match.matchStickers.length && (
                      <button
                        type="button"
                        onClick={() => setReceiving(new Set(match.matchStickers))}
                        className="text-[10px] text-yvy-accent underline"
                      >
                        Todos
                      </button>
                    )}
                    {receiving.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setReceiving(new Set())}
                        className="text-[10px] text-yvy-muted underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.matchStickers.map((id) => (
                    <StickerChip
                      key={id}
                      id={id}
                      selected={receiving.has(id)}
                      onToggle={() => toggleSet(setReceiving, id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {match.reciprocalStickers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted">
                    Eu tenho para ele/ela — toque para selecionar ({giving.size}/
                    {match.reciprocalStickers.length})
                  </p>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {giving.size < match.reciprocalStickers.length && (
                      <button
                        type="button"
                        onClick={() => setGiving(new Set(match.reciprocalStickers))}
                        className="text-[10px] text-yvy-accent underline"
                      >
                        Todos
                      </button>
                    )}
                    {giving.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setGiving(new Set())}
                        className="text-[10px] text-yvy-muted underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.reciprocalStickers.map((id) => (
                    <StickerChip
                      key={id}
                      id={id}
                      selected={giving.has(id)}
                      onToggle={() => toggleSet(setGiving, id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {match.matchStickers.length === 0 && match.reciprocalStickers.length === 0 && (
              <p className="text-sm text-yvy-muted">Sem figurinhas para trocar no momento.</p>
            )}

            {canTrade && (
              <div className="border-t border-yvy-border pt-3 space-y-2">
                <p className="text-xs text-yvy-muted">
                  Selecione as figurinhas e toque em confirmar para revisar antes de executar.
                </p>
                <button
                  onClick={() => setConfirming(true)}
                  className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  {`Confirmar troca (${receiving.size + giving.size} figurinha${receiving.size + giving.size !== 1 ? 's' : ''})`}
                </button>
              </div>
            )}

            {tradeMsg && (
              <p className={`text-sm ${tradeMsg.ok ? 'text-yvy-dark' : 'text-red-600'}`}>
                {tradeMsg.text}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function MatchCard({
  match,
  rank,
  nearComplete,
  onTradeCreated,
}: {
  match: MatchResult
  rank: number
  nearComplete?: boolean
  onTradeCreated?: () => void
}) {
  const isMutual = match.mutualScore > 0
  const hasBanner = nearComplete || rank === 1
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
      <div
        className={`bg-yvy-surface rounded-xl border shadow-md flex flex-col gap-3 overflow-hidden ${
          nearComplete
            ? 'border-amber-400 border-2'
            : rank === 1
              ? 'border-yvy-gold border-2'
              : isMutual
                ? 'border-yvy-accent p-4'
                : 'border-yvy-border p-4'
        }`}
      >
        {/* Near-complete amber banner */}
        {nearComplete && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-400">
            <span className="text-white text-sm leading-none">🎯</span>
            <span className="text-white text-[11px] font-bold uppercase tracking-widest">
              Quase completo — Ajude!
            </span>
            <span className="ml-auto text-white text-[11px] font-bold">
              {match.completionPct}%
            </span>
          </div>
        )}

        {/* #1 trophy banner (only when not near-complete) */}
        {rank === 1 && !nearComplete && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yvy-gold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 2H17V13C17 15.761 14.761 18 12 18C9.239 18 7 15.761 7 13V2Z"
                fill="white"
              />
              <path d="M7 5H4C4 5 3 10 7 11V5Z" fill="white" />
              <path d="M17 5H20C20 5 21 10 17 11V5Z" fill="white" />
              <rect x="9" y="18" width="6" height="2" fill="white" />
              <rect x="7" y="20" width="10" height="2" rx="1" fill="white" />
            </svg>
            <span className="text-white text-[11px] font-bold uppercase tracking-widest">
              Melhor parceiro de troca
            </span>
          </div>
        )}

        {/* Header */}
        <div className={`flex items-start justify-between gap-2 ${hasBanner ? 'px-4 pb-1' : ''}`}>
          <div className="flex items-start gap-2.5">
            <span
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
                nearComplete
                  ? 'bg-amber-400 text-white'
                  : rank === 1
                    ? 'bg-yvy-gold text-white'
                    : 'bg-yvy-bg text-yvy-muted border border-yvy-border'
              }`}
            >
              {rank}
            </span>
            <div>
              <p className="font-semibold text-yvy-dark text-sm capitalize">{match.name}</p>
              <p className="text-xs text-yvy-muted mt-0.5">
                Apto {match.apartment.toUpperCase()} · Torre {match.tower}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!nearComplete && match.completionPct >= 85 && (
              <span className="text-[10px] font-semibold bg-amber-400/20 text-amber-700 px-2 py-1 rounded-full">
                🎯 {match.completionPct}%
              </span>
            )}
            {isMutual && (
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-yvy-accent/15 text-yvy-dark px-2 py-1 rounded-full">
                Troca mútua
              </span>
            )}
          </div>
        </div>

        {/* Scores */}
        <div className={hasBanner ? 'px-4 pb-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
          {nearComplete && (
            <div className="space-y-1">
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${match.completionPct}%` }}
                />
              </div>
              {match.reciprocalScore > 0 && (
                <p className="text-xs text-amber-700 font-medium">
                  Você tem <strong>{match.reciprocalScore}</strong> das{' '}
                  <strong>{match.missingCount}</strong> figurinhas que faltam
                </p>
              )}
            </div>
          )}

          {match.matchScore > 0 || match.reciprocalScore > 0 ? (
            <>
              {(() => {
                const chromeMatch = match.matchStickers.filter(isChromeSticker).length
                const chromeReciprocal = match.reciprocalStickers.filter(isChromeSticker).length
                return (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-yvy-bg rounded-lg px-3 py-2">
                      <p className="text-[10px] text-yvy-muted uppercase tracking-wide mb-0.5">
                        Ele/ela tem para mim
                      </p>
                      <p className="text-lg font-bold text-yvy-dark leading-none">
                        {match.matchScore}
                        <span className="text-xs font-normal text-yvy-muted ml-1">
                          {match.matchScore === 1 ? 'figurinha' : 'figurinhas'}
                        </span>
                      </p>
                      {chromeMatch > 0 && (
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                          ✨ {chromeMatch} cromada{chromeMatch !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="bg-yvy-bg rounded-lg px-3 py-2">
                      <p className="text-[10px] text-yvy-muted uppercase tracking-wide mb-0.5">
                        Eu tenho para ele/ela
                      </p>
                      <p className="text-lg font-bold text-yvy-accent leading-none">
                        {match.reciprocalScore}
                        <span className="text-xs font-normal text-yvy-muted ml-1">
                          {match.reciprocalScore === 1 ? 'figurinha' : 'figurinhas'}
                        </span>
                      </p>
                      {chromeReciprocal > 0 && (
                        <p className="text-[10px] text-amber-600 font-medium mt-0.5">
                          ✨ {chromeReciprocal} cromada{chromeReciprocal !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}

              {isMutual && (
                <p className="text-xs text-yvy-dark font-medium">
                  Troca equilibrada de <strong>{match.mutualScore}</strong>{' '}
                  {match.mutualScore === 1 ? 'figurinha' : 'figurinhas'} para cada lado.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs text-yvy-muted">Sem figurinhas para trocar no momento.</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <a
              href={`https://wa.me/${match.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-yvy-muted text-xs hover:text-yvy-dark transition-colors"
            >
              <svg
                className="w-3.5 h-3.5 fill-current flex-shrink-0"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </a>
            <button
              onClick={() => setShowDetail(true)}
              className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
            >
              Realizar Troca
            </button>
          </div>
        </div>
      </div>

      {showDetail && (
        <DetailModal
          match={match}
          onClose={() => setShowDetail(false)}
          onTradeCreated={onTradeCreated}
        />
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import WhatsAppButton from './WhatsAppButton'
import type { MatchResult } from '@/lib/matching'
import { effectuateTrade } from '@/actions/effectuateTrade'

function StickerChip({ id, selected, onToggle }: { id: string; selected: boolean; onToggle: () => void }) {
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
      {id}
    </button>
  )
}

function DetailModal({ match, onClose }: { match: MatchResult; onClose: () => void }) {
  const [receiving, setReceiving] = useState<Set<string>>(new Set())
  const [giving, setGiving] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [trading, setTrading] = useState(false)
  const [tradeMsg, setTradeMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
    setter((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  async function handleTrade() {
    const currentUserId = localStorage.getItem('userId')
    if (!currentUserId) return
    setTrading(true)
    setTradeMsg(null)
    try {
      const result = await effectuateTrade(
        currentUserId,
        match.userId,
        [...giving],
        [...receiving],
      )
      if (result.success) {
        setTradeMsg({ ok: true, text: 'Troca registrada! Atualize a página para ver os novos dados.' })
        setReceiving(new Set())
        setGiving(new Set())
        setConfirming(false)
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-yvy-surface rounded-2xl shadow-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="font-semibold text-yvy-dark capitalize">{match.name}</p>
          <button onClick={onClose} className="text-yvy-muted text-lg leading-none">✕</button>
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
                    <span key={id} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-dark text-white">{id}</span>
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
                    <span key={id} className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-yvy-border text-yvy-text">{id}</span>
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
                {trading ? 'Registrando...' : 'Sim, confirmar'}
              </button>
            </div>

            {tradeMsg && (
              <p className={`text-sm ${tradeMsg.ok ? 'text-yvy-dark' : 'text-red-600'}`}>{tradeMsg.text}</p>
            )}
          </div>
        ) : (
          <>
            {match.matchStickers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1.5">
                  Ele/ela tem para mim — toque para selecionar ({receiving.size}/{match.matchStickers.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {match.matchStickers.map((id) => (
                    <StickerChip key={id} id={id} selected={receiving.has(id)} onToggle={() => toggleSet(setReceiving, id)} />
                  ))}
                </div>
              </div>
            )}

            {match.reciprocalStickers.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1.5">
                  Eu tenho para ele/ela — toque para selecionar ({giving.size}/{match.reciprocalStickers.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {match.reciprocalStickers.map((id) => (
                    <StickerChip key={id} id={id} selected={giving.has(id)} onToggle={() => toggleSet(setGiving, id)} />
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
              <p className={`text-sm ${tradeMsg.ok ? 'text-yvy-dark' : 'text-red-600'}`}>{tradeMsg.text}</p>
            )}

            <WhatsAppButton phone={match.phone} />
          </>
        )}
      </div>
    </div>
  )
}

export default function MatchCard({ match, rank }: { match: MatchResult; rank: number }) {
  const isMutual = match.mutualScore > 0
  const [showDetail, setShowDetail] = useState(false)

  return (
    <>
    <div
      className={`bg-yvy-surface rounded-xl border shadow-md flex flex-col gap-3 overflow-hidden ${
        rank === 1
          ? 'border-yvy-gold border-2'
          : isMutual ? 'border-yvy-accent p-4' : 'border-yvy-border p-4'
      }`}
    >
      {/* #1 trophy banner */}
      {rank === 1 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yvy-gold">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 2H17V13C17 15.761 14.761 18 12 18C9.239 18 7 15.761 7 13V2Z" fill="white"/>
            <path d="M7 5H4C4 5 3 10 7 11V5Z" fill="white"/>
            <path d="M17 5H20C20 5 21 10 17 11V5Z" fill="white"/>
            <rect x="9" y="18" width="6" height="2" fill="white"/>
            <rect x="7" y="20" width="10" height="2" rx="1" fill="white"/>
          </svg>
          <span className="text-white text-[11px] font-bold uppercase tracking-widest">Melhor parceiro de troca</span>
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start justify-between gap-2 ${rank === 1 ? 'px-4 pb-1' : ''}`}>
        <div className="flex items-start gap-2.5">
          <span
            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
              rank === 1
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
          {isMutual && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-yvy-accent/15 text-yvy-dark px-2 py-1 rounded-full">
              Troca mútua
            </span>
          )}
          <button
            onClick={() => setShowDetail(true)}
            className="text-[10px] font-semibold text-yvy-accent underline whitespace-nowrap"
          >
            Ver detalhes
          </button>
        </div>
      </div>

      {/* Scores */}
      <div className={rank === 1 ? 'px-4 pb-4 flex flex-col gap-3' : 'flex flex-col gap-3'}>
      {match.matchScore > 0 || match.reciprocalScore > 0 ? (
        <>
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
            </div>
          </div>

          {isMutual && (
            <p className="text-xs text-yvy-dark font-medium">
              Troca equilibrada de{' '}
              <strong>{match.mutualScore}</strong>{' '}
              {match.mutualScore === 1 ? 'figurinha' : 'figurinhas'} para cada lado.
            </p>
          )}

        </>
      ) : (
        <p className="text-xs text-yvy-muted">Sem figurinhas para trocar no momento.</p>
      )}

      <WhatsAppButton phone={match.phone} />
      </div>
    </div>

    {showDetail && <DetailModal match={match} onClose={() => setShowDetail(false)} />}
    </>
  )
}

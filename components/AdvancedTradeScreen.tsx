'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAdvancedTrades, type AdvancedTradeView } from '@/actions/getAdvancedTrades'
import { findAdvancedTrade } from '@/actions/findAdvancedTrade'
import { previewAdvancedTrade, type AdvancedTradePreview } from '@/actions/previewAdvancedTrade'
import { respondToAdvancedTrade } from '@/actions/respondToAdvancedTrade'
import { isChromeSticker, isCocaColaSticker, sortByAlbumOrder } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'

function StickerList({ ids, label }: { ids: string[]; label: string }) {
  const { stickerOrder } = usePrefs()
  if (ids.length === 0) return null
  const sorted = stickerOrder === 'album' ? sortByAlbumOrder(ids) : [...ids].sort()
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {sorted.map((id) => (
          <span
            key={id}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-yvy-bg border border-yvy-border text-yvy-text"
          >
            {isChromeSticker(id) ? (
              <span className="font-bold text-amber-500">{id}</span>
            ) : isCocaColaSticker(id) ? (
              <span className="font-bold text-red-500">{id}</span>
            ) : (
              id
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'approved') {
    return (
      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        ✓ Aprovado
      </span>
    )
  }
  if (status === 'rejected') {
    return (
      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        ✗ Recusado
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
      ⏳ Pendente
    </span>
  )
}

function TradeCard({
  trade,
  userId,
  onDone,
}: {
  trade: AdvancedTradeView
  userId: string
  onDone: () => void
}) {
  const [loading, setLoading] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<'approve' | 'reject' | 'cancel' | null>(null)

  async function handle(action: 'approve' | 'reject' | 'cancel') {
    setLoading(action)
    setMsg(null)
    try {
      const result = await respondToAdvancedTrade(trade.id, userId, action)
      if (result.success) {
        onDone()
      } else {
        setMsg(result.error)
      }
    } catch {
      setMsg('Erro inesperado. Tente novamente.')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  const isPending = trade.myApprovalStatus === 'pending'
  const isAccepted = trade.status === 'accepted'

  return (
    <div
      className={`bg-yvy-surface rounded-xl border shadow-md p-4 space-y-3 ${
        isAccepted ? 'border-emerald-200' : 'border-yvy-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-yvy-muted">
          Troca Triangular
        </p>
        {isAccepted && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Concluída
          </span>
        )}
      </div>

      {/* Triangle visualization */}
      <div className="space-y-2">
        <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-yvy-dark">
            Você dá para <span className="capitalize">{trade.giveTo.name}</span>
          </p>
          <StickerList ids={trade.myGivingIds} label="" />
        </div>

        <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-yvy-dark">
            Você recebe de <span className="capitalize">{trade.receiveFrom.name}</span>
          </p>
          <StickerList ids={trade.myReceivingIds} label="" />
        </div>

        <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-yvy-dark">
            <span className="capitalize">{trade.thirdParty.name}</span> dá para{' '}
            <span className="capitalize">{trade.thirdParty.givesToName}</span>
          </p>
          <StickerList ids={trade.thirdParty.givesIds} label="" />
        </div>
      </div>

      {/* Participant statuses */}
      <div className="flex flex-wrap gap-2 items-center">
        <p className="text-[10px] text-yvy-muted font-medium">Status:</p>
        {trade.otherStatuses.map((s) => (
          <div key={s.name} className="flex items-center gap-1">
            <span className="text-[10px] text-yvy-muted capitalize">{s.name.split(' ')[0]}:</span>
            <StatusBadge status={s.status} />
          </div>
        ))}
      </div>

      {msg && <p className="text-xs text-red-600">{msg}</p>}

      {/* Actions */}
      {isPending && trade.status === 'pending' && (
        <>
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
                onClick={() => handle('reject')}
                disabled={loading !== null}
                className="text-xs font-semibold text-red-600 underline disabled:opacity-50"
              >
                {loading === 'reject' ? '...' : 'Sim, recusar'}
              </button>
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
                onClick={() => handle('approve')}
                disabled={loading !== null}
                className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {loading === 'approve' ? 'Aprovando...' : 'Aprovar'}
              </button>
            </div>
          )}
        </>
      )}

      {trade.myApprovalStatus === 'approved' && trade.status === 'pending' && (
        <div className="space-y-2">
          <p className="text-xs text-emerald-600 font-medium">
            ✓ Você aprovou. Aguardando os outros participantes.
          </p>
          {trade.isRequester && (
            <>
              {confirming === 'cancel' ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-yvy-muted flex-1">Cancelar esta troca?</p>
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={loading !== null}
                    className="text-xs text-yvy-muted underline disabled:opacity-50"
                  >
                    Não
                  </button>
                  <button
                    onClick={() => handle('cancel')}
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
                  Cancelar proposta
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdvancedTradeScreen() {
  const [userId, setUserId] = useState<string | null>(null)
  const [trades, setTrades] = useState<AdvancedTradeView[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null)
  const [previews, setPreviews] = useState<AdvancedTradePreview[]>([])
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTrades = useCallback(async (uid: string) => {
    try {
      const result = await getAdvancedTrades(uid)
      setTrades(result)
    } catch {
      setError('Erro ao carregar trocas avançadas.')
    }
  }, [])

  useEffect(() => {
    const uid = localStorage.getItem('userId')
    if (!uid) {
      setError('Você precisa se identificar primeiro.')
      setLoading(false)
      return
    }
    setUserId(uid)
    loadTrades(uid).finally(() => setLoading(false))
  }, [loadTrades])

  async function handleSearch() {
    if (!userId) return
    setSearching(true)
    setSearchMsg(null)
    setPreviews([])
    try {
      const result = await previewAdvancedTrade(userId)
      if (result.found) {
        setPreviews(result.previews)
      } else {
        setSearchMsg(
          result.error ?? 'Nenhuma troca triangular disponível no momento. Tente mais tarde.'
        )
      }
    } catch {
      setSearchMsg('Erro inesperado. Tente novamente.')
    } finally {
      setSearching(false)
    }
  }

  async function handleConfirm(idx: number) {
    if (!userId) return
    const selected = previews[idx]
    if (!selected) return
    setConfirmingIdx(idx)
    setSearchMsg(null)
    try {
      const result = await findAdvancedTrade(userId, {
        userAId: selected.userA.id,
        userBId: selected.userB.id,
        userCId: selected.userC.id,
        aGivesIds: selected.aGivesIds,
        bGivesIds: selected.bGivesIds,
        cGivesIds: selected.cGivesIds,
      })
      if (result.found) {
        await loadTrades(userId)
        const fresh = await previewAdvancedTrade(userId)
        setPreviews(fresh.found ? fresh.previews : [])
      } else {
        setSearchMsg(
          result.error ?? 'Erro ao criar proposta. Tente novamente.'
        )
      }
    } catch {
      setSearchMsg('Erro inesperado. Tente novamente.')
    } finally {
      setConfirmingIdx(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 pb-8">
        <p className="text-sm text-yvy-muted text-center">Carregando...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-20 pb-8">
        <p className="text-sm text-red-600 text-center">{error}</p>
      </div>
    )
  }

  const pendingTrades = trades.filter((t) => t.status === 'pending')
  const completedTrades = trades.filter((t) => t.status === 'accepted')

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-8 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-yvy-dark">Troca Avançada</h2>
        <p className="text-xs text-yvy-muted mt-1">
          Troca triangular entre 3 moradores. O sistema encontra automaticamente a melhor
          combinação onde todos se beneficiam, mesmo quando uma troca direta não é possível.
        </p>
      </div>

      {/* Pending trades */}
      {pendingTrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-yvy-dark">Propostas pendentes</h3>
          {pendingTrades.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              userId={userId!}
              onDone={() => loadTrades(userId!)}
            />
          ))}
        </div>
      )}

      {/* Search / Preview / Confirm */}
      {previews.length === 0 && (
        <div className="space-y-3">
          <div className="bg-yvy-bg rounded-xl p-4 space-y-3">
            <p className="text-xs text-yvy-muted leading-relaxed">
              Quando uma troca direta não é possível, o sistema busca um terceiro morador que
              fecha o ciclo. Exemplo: você dá para A, A dá para B, B dá para você.
            </p>
            <p className="text-xs text-yvy-muted leading-relaxed">
              Todos os 3 participantes precisam aprovar para a troca acontecer. As figurinhas
              são selecionadas automaticamente pelo sistema.
            </p>
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {searching ? 'Buscando...' : 'Buscar Troca Triangular'}
          </button>
          {searchMsg && (
            <p className="text-xs text-yvy-muted text-center">{searchMsg}</p>
          )}
        </div>
      )}

      {/* Preview all proposals ranked by score */}
      {previews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-yvy-dark">
              {previews.length === 1
                ? 'Proposta encontrada'
                : `${previews.length} propostas encontradas`}
            </h3>
            <button
              onClick={() => { setPreviews([]); setSearchMsg(null) }}
              className="text-xs text-yvy-muted underline"
            >
              Voltar
            </button>
          </div>

          {searchMsg && (
            <p className="text-xs text-red-600 text-center">{searchMsg}</p>
          )}

          {previews.map((preview, idx) => (
            <div
              key={`${preview.userB.id}-${preview.userC.id}`}
              className={`bg-yvy-surface rounded-xl border shadow-md p-4 space-y-3 ${
                idx === 0 ? 'border-yvy-accent' : 'border-yvy-border'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wide text-yvy-muted">
                  Opção {idx + 1}
                </span>
                <span className="text-[10px] font-bold text-yvy-accent bg-yvy-accent/10 px-2 py-0.5 rounded-full">
                  {preview.score} figurinha{preview.score !== 1 ? 's' : ''} cada
                </span>
              </div>

              <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-yvy-dark">
                  Você dá para <span className="capitalize">{preview.userB.name}</span>
                </p>
                <StickerList ids={preview.aGivesIds} label="" />
              </div>
              <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-yvy-dark">
                  Você recebe de <span className="capitalize">{preview.userC.name}</span>
                </p>
                <StickerList ids={preview.cGivesIds} label="" />
              </div>
              <div className="bg-yvy-bg rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-yvy-dark">
                  <span className="capitalize">{preview.userB.name}</span> dá para{' '}
                  <span className="capitalize">{preview.userC.name}</span>
                </p>
                <StickerList ids={preview.bGivesIds} label="" />
              </div>

              <button
                onClick={() => handleConfirm(idx)}
                disabled={confirmingIdx !== null}
                className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {confirmingIdx === idx ? 'Enviando...' : 'Confirmar esta proposta'}
              </button>
            </div>
          ))}

          <p className="text-xs text-yvy-muted text-center leading-relaxed">
            Ao confirmar, os outros 2 participantes receberão a proposta e precisarão aprovar
            para a troca acontecer.
          </p>
        </div>
      )}

      {/* Completed trades */}
      {completedTrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-yvy-dark">Trocas concluídas</h3>
          {completedTrades.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              userId={userId!}
              onDone={() => loadTrades(userId!)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

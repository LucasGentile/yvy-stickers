'use client'
import LoadingScreen from '@/components/LoadingScreen'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { getAdvancedTrades, type AdvancedTradeView } from '@/actions/getAdvancedTrades'
import { getAdvancedTradeEligibility } from '@/actions/getAdvancedTradeEligibility'
import { findAdvancedTrade } from '@/actions/findAdvancedTrade'
import { previewAdvancedTrade, type AdvancedTradePreview } from '@/actions/previewAdvancedTrade'
import { respondToAdvancedTrade } from '@/actions/respondToAdvancedTrade'
import { rollbackAdvancedTrade } from '@/actions/rollbackAdvancedTrade'
import { verifyTrade } from '@/actions/verifyTrade'
import { checkAlreadyOwnedIncoming, type AlreadyOwnedResult } from '@/actions/checkAlreadyOwnedIncoming'
import { useNotification } from '@/contexts/NotificationContext'
import { StickerList } from '@/components/trades/StickerList'
import { AlreadyOwnedWarningModal } from '@/components/trades/AlreadyOwnedWarningModal'
import { ColorLegend } from '@/components/trades/ColorLegend'
import { TradeAssistant } from '@/components/audit/TradeAssistant'
import { relativeTime, absoluteTime } from '@/components/audit/eventConfig'
import { PartnerChip, VerifiedFilterChip, FilterChipDivider } from '@/components/FilterChips'
import { Pagination } from '@/components/Pagination'

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
  const { showSuccess, showError } = useNotification()
  const [loading, setLoading] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState<'confirm' | 'deny' | null>(null)
  const [confirming, setConfirming] = useState<'approve' | 'reject' | 'cancel' | null>(null)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [verified, setVerified] = useState(trade.verified)
  const [alreadyOwned, setAlreadyOwned] = useState<AlreadyOwnedResult>({ myAlreadyOwned: [], theirAlreadyOwned: [] })
  const [showAlreadyOwnedModal, setShowAlreadyOwnedModal] = useState(false)
  const [modalLoading, setModalLoading] = useState<'confirm' | 'reject' | null>(null)

  useEffect(() => {
    if (trade.myReceivingIds.length === 0 && trade.myGivingIds.length === 0) return
    checkAlreadyOwnedIncoming(userId, trade.giveTo.id, trade.myReceivingIds, trade.myGivingIds)
      .then(setAlreadyOwned)
      .catch(() => setAlreadyOwned({ myAlreadyOwned: [], theirAlreadyOwned: [] }))
  }, [userId, trade.giveTo.id, trade.myReceivingIds, trade.myGivingIds])

  const advancedActionLabels = {
    approve: 'Troca triangular aprovada!',
    reject: 'Troca triangular recusada.',
    cancel: 'Proposta de troca triangular cancelada.',
  } as const

  async function handle(action: 'approve' | 'reject' | 'cancel') {
    setLoading(action)
    try {
      const result = await respondToAdvancedTrade(trade.id, userId, action)
      if (result.success) {
        showSuccess(advancedActionLabels[action])
        onDone()
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado. Tente novamente ou procure ajuda.')
    } finally {
      setLoading(null)
      setConfirming(null)
    }
  }

  async function handleRollbackResponse(action: 'confirm' | 'deny') {
    setRollbackLoading(action)
    try {
      const result = await rollbackAdvancedTrade(trade.id, userId, action)
      if (result.success) {
        showSuccess(action === 'confirm' ? 'Troca triangular desfeita com sucesso!' : 'Desfazimento recusado.')
        onDone()
      } else {
        showError(`${result.error} Tente novamente ou procure ajuda.`)
      }
    } catch {
      showError('Erro inesperado. Tente novamente ou procure ajuda.')
    } finally {
      setRollbackLoading(null)
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
          <div className="flex items-center gap-2 shrink-0">
            {trade.acceptedAt &&
              (trade.auditEntryId ? (
                <Link
                  href={`/history/${trade.auditEntryId}`}
                  className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                >
                  <span className="text-[10px] text-yvy-muted">
                    {relativeTime(trade.acceptedAt)}
                  </span>
                  <span className="text-[10px] text-yvy-muted/60">
                    {absoluteTime(trade.acceptedAt)}
                  </span>
                </Link>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="text-[10px] text-yvy-muted">
                    {relativeTime(trade.acceptedAt)}
                  </span>
                  <span className="text-[10px] text-yvy-muted/60">
                    {absoluteTime(trade.acceptedAt)}
                  </span>
                </span>
              ))}
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {verified && <span className="text-emerald-500">✓</span>}
              Concluída
            </span>
          </div>
        )}
      </div>

      {/* Triangle visualization */}
      <div className="space-y-2">
        <div className="bg-rose-50/50 rounded-lg p-3 space-y-2 border border-rose-100">
          <p className="text-xs font-semibold text-rose-700">
            Você dá {trade.myGivingIds.length} para{' '}
            <span className="capitalize">{trade.giveTo.name}</span> →
          </p>
          <StickerList ids={trade.myGivingIds} label="" variant="giving" alreadyOwnedIds={alreadyOwned.theirAlreadyOwned.length > 0 ? new Set(alreadyOwned.theirAlreadyOwned) : undefined} />
        </div>

        <div className="bg-green-50/50 rounded-lg p-3 space-y-2 border border-green-100">
          <p className="text-xs font-semibold text-green-700">
            ← Você recebe {trade.myReceivingIds.length} de{' '}
            <span className="capitalize">{trade.receiveFrom.name}</span>
          </p>
          <StickerList ids={trade.myReceivingIds} label="" variant="receiving" alreadyOwnedIds={alreadyOwned.myAlreadyOwned.length > 0 ? new Set(alreadyOwned.myAlreadyOwned) : undefined} />
        </div>

        <div className="bg-sky-50/50 rounded-lg p-3 space-y-2 border border-sky-100">
          <p className="text-xs font-semibold text-sky-700">
            <span className="capitalize">{trade.thirdParty.name}</span> dá{' '}
            {trade.thirdParty.givesIds.length} para{' '}
            <span className="capitalize">{trade.thirdParty.givesToName}</span>
          </p>
          <StickerList ids={trade.thirdParty.givesIds} label="" variant="third-party" />
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

      {isAccepted && (
        <>
          <button
            onClick={() => setAssistantOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <span>📋</span>
            Assistente de troca
          </button>
          {assistantOpen && (
            <TradeAssistant
              partnerName={`${trade.giveTo.name} e ${trade.receiveFrom.name}`}
              givingIds={trade.myGivingIds}
              receivingIds={trade.myReceivingIds}
              onClose={() => setAssistantOpen(false)}
              onVerify={
                verified
                  ? undefined
                  : async () => {
                      const result = await verifyTrade(trade.id, userId, 'advanced')
                      if (result.success) {
                        setVerified(true)
                      } else {
                        throw new Error(result.error)
                      }
                    }
              }
            />
          )}
        </>
      )}

      {/* Rollback response UI — only shown when someone else requested an undo */}
      {isAccepted && trade.rollbackRequestedBy !== null && trade.rollbackRequestedBy !== userId && (
        <div className="space-y-2">
          <p className="text-xs text-amber-700 font-medium">
            {trade.rollbackRequesterName} quer desfazer esta troca.
          </p>
          {trade.myRollbackStatus === 'none' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleRollbackResponse('deny')}
                disabled={rollbackLoading !== null}
                className="flex-1 border border-yvy-border text-yvy-text font-semibold py-2 rounded-xl text-sm transition-colors hover:bg-yvy-bg disabled:opacity-50"
              >
                {rollbackLoading === 'deny' ? '...' : 'Manter troca'}
              </button>
              <button
                onClick={() => handleRollbackResponse('confirm')}
                disabled={rollbackLoading !== null}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {rollbackLoading === 'confirm' ? 'Desfazendo...' : 'Confirmar desfazimento'}
              </button>
            </div>
          )}
          {trade.myRollbackStatus === 'approved' && (
            <p className="text-xs text-emerald-600 font-medium">
              Você confirmou. Aguardando os outros participantes.
            </p>
          )}
        </div>
      )}

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
                onClick={() => {
                  if (alreadyOwned.myAlreadyOwned.length > 0 || alreadyOwned.theirAlreadyOwned.length > 0) {
                    setShowAlreadyOwnedModal(true)
                    return
                  }
                  handle('approve')
                }}
                disabled={loading !== null}
                className="flex-1 bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
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
        </div>
      )}

      <AlreadyOwnedWarningModal
        open={showAlreadyOwnedModal}
        myAlreadyOwnedIds={alreadyOwned.myAlreadyOwned}
        theirAlreadyOwnedIds={alreadyOwned.theirAlreadyOwned}
        otherUserName={trade.giveTo.name}
        loading={modalLoading}
        onConfirm={async () => {
          setModalLoading('confirm')
          setShowAlreadyOwnedModal(false)
          setModalLoading(null)
          await handle('approve')
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

const COMPLETED_PAGE_SIZE = 3

function getAdvancedPartnerNames(trades: AdvancedTradeView[]) {
  const names = new Set<string>()
  for (const t of trades) {
    names.add(t.giveTo.name)
    names.add(t.receiveFrom.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

function CompletedTradesSection({
  trades,
  userId,
  onRefresh,
}: {
  trades: AdvancedTradeView[]
  userId: string
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(0)
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null)
  const [onlyUnverified, setOnlyUnverified] = useState(false)

  const partnerNames = getAdvancedPartnerNames(trades)

  let filtered = selectedPartner
    ? trades.filter(
        (t) => t.giveTo.name === selectedPartner || t.receiveFrom.name === selectedPartner
      )
    : trades

  if (onlyUnverified) {
    filtered = filtered.filter((t) => !t.verified)
  }

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.acceptedAt ?? 0).getTime() - new Date(a.acceptedAt ?? 0).getTime()
  )
  const totalPages = Math.ceil(sorted.length / COMPLETED_PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const visible = expanded
    ? sorted.slice(safePage * COMPLETED_PAGE_SIZE, (safePage + 1) * COMPLETED_PAGE_SIZE)
    : []

  function handlePartnerSelect(name: string) {
    setSelectedPartner((prev) => (prev === name ? null : name))
    setPage(0)
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span
          className="text-[10px] text-yvy-muted transition-transform"
          style={{ transform: expanded ? 'rotate(90deg)' : undefined }}
        >
          ▶
        </span>
        <h3 className="text-sm font-bold text-yvy-muted">
          Trocas concluídas ({trades.length})
          {selectedPartner && (
            <span className="font-normal text-xs ml-1">
              · {filtered.length} com {selectedPartner}
            </span>
          )}
        </h3>
      </button>

      {expanded && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {partnerNames.length > 1 && (
              <>
                {partnerNames.map((name) => (
                  <PartnerChip
                    key={name}
                    name={name}
                    selected={selectedPartner === name}
                    onSelect={() => handlePartnerSelect(name)}
                  />
                ))}
                <FilterChipDivider />
              </>
            )}
            <VerifiedFilterChip
              active={onlyUnverified}
              onToggle={() => {
                setOnlyUnverified((v) => !v)
                setPage(0)
              }}
            />
          </div>

          {sorted.length === 0 ? (
            <p className="text-xs text-yvy-muted text-center py-4">
              {onlyUnverified
                ? 'Todas as trocas já foram verificadas.'
                : `Nenhuma troca concluída com ${selectedPartner}.`}
            </p>
          ) : (
            <>
              {visible.map((t) => (
                <TradeCard key={t.id} trade={t} userId={userId} onDone={onRefresh} />
              ))}

              <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdvancedTradeScreen() {
  const { showSuccess, showError } = useNotification()
  const [userId, setUserId] = useState<string | null>(null)
  const [trades, setTrades] = useState<AdvancedTradeView[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searching, setSearching] = useState(false)
  const [confirmingIdx, setConfirmingIdx] = useState<number | null>(null)

  const isBusy = refreshing || searching || confirmingIdx !== null
  const [previews, setPreviews] = useState<AdvancedTradePreview[]>([])
  const [canSearch, setCanSearch] = useState(true)
  const [searchMsg, setSearchMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadTrades = useCallback(async (uid: string) => {
    try {
      const [result, eligibility] = await Promise.all([
        getAdvancedTrades(uid),
        getAdvancedTradeEligibility(uid),
      ])
      setTrades(result)
      setCanSearch(eligibility.canSearch)
      window.dispatchEvent(new Event('trade-action'))
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

  async function handleRefresh() {
    if (!userId || isBusy) return
    setRefreshing(true)
    setSearchMsg(null)
    try {
      await loadTrades(userId)
      const fresh = await previewAdvancedTrade(userId)
      if (fresh.found) {
        setPreviews(fresh.previews)
      } else {
        setPreviews([])
      }
    } catch {
      /* silently ignore */
    } finally {
      setRefreshing(false)
    }
  }

  async function handleSearch() {
    if (!userId || isBusy) return
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
    if (!userId || isBusy) return
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
        showSuccess('Proposta de troca triangular enviada! Aguardando aprovação dos participantes.')
        await loadTrades(userId)
        const fresh = await previewAdvancedTrade(userId)
        if (fresh.found) {
          setPreviews(fresh.previews)
        } else {
          setPreviews([])
          setCanSearch(false)
        }
      } else {
        showError(result.error ?? 'Erro ao criar proposta. Tente novamente.')
        setSearchMsg(result.error ?? 'Erro ao criar proposta. Tente novamente.')
      }
    } catch {
      showError('Erro inesperado. Tente novamente.')
      setSearchMsg('Erro inesperado. Tente novamente.')
    } finally {
      setConfirmingIdx(null)
    }
  }

  if (loading) {
    return <LoadingScreen />
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-gold pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
            Troca Avançada
          </h2>
          <p className="text-xs text-yvy-muted mt-1">
            Troca triangular entre 3 moradores. O sistema encontra automaticamente a melhor
            combinação onde todos se beneficiam, mesmo quando uma troca direta não é possível.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isBusy}
          className="shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center text-yvy-muted hover:bg-yvy-bg hover:text-yvy-dark transition-colors disabled:opacity-50"
          aria-label="Atualizar"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      <ColorLegend />

      {/* Pending trades */}
      {pendingTrades.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-yvy-dark">Propostas pendentes</h3>
          {pendingTrades.map((t) => (
            <TradeCard key={t.id} trade={t} userId={userId!} onDone={() => loadTrades(userId!)} />
          ))}
        </div>
      )}

      {/* Search / Preview / Confirm */}
      {previews.length === 0 && (
        <div className="space-y-4">
          {/* Visual triangle diagram */}
          <div className="bg-yvy-surface rounded-2xl border border-yvy-gold/20 shadow-md p-5 space-y-4">
            <div className="flex justify-center">
              <svg width="180" height="140" viewBox="0 0 180 140" fill="none" aria-hidden="true">
                {/* Triangle nodes */}
                <circle
                  cx="90"
                  cy="20"
                  r="16"
                  className="fill-yvy-accent/20 stroke-yvy-accent"
                  strokeWidth="2"
                />
                <circle
                  cx="30"
                  cy="120"
                  r="16"
                  className="fill-purple-100 stroke-purple-400"
                  strokeWidth="2"
                />
                <circle
                  cx="150"
                  cy="120"
                  r="16"
                  className="fill-amber-100 stroke-amber-500"
                  strokeWidth="2"
                />
                {/* Labels */}
                <text
                  x="90"
                  y="24"
                  textAnchor="middle"
                  className="fill-yvy-accent text-[11px] font-bold"
                >
                  Você
                </text>
                <text
                  x="30"
                  y="124"
                  textAnchor="middle"
                  className="fill-purple-600 text-[10px] font-bold"
                >
                  B
                </text>
                <text
                  x="150"
                  y="124"
                  textAnchor="middle"
                  className="fill-amber-600 text-[10px] font-bold"
                >
                  C
                </text>
                {/* Arrows: A→B */}
                <path
                  d="M 74 30 L 42 106"
                  className="stroke-yvy-accent"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                />
                {/* Arrows: B→C */}
                <path
                  d="M 48 120 L 132 120"
                  className="stroke-purple-400"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                />
                {/* Arrows: C→A */}
                <path
                  d="M 138 106 L 106 30"
                  className="stroke-amber-500"
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  markerEnd="url(#arrowhead)"
                />
                {/* Arrowhead marker */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="8"
                    markerHeight="6"
                    refX="7"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" className="fill-yvy-muted" />
                  </marker>
                </defs>
              </svg>
            </div>

            <div className="text-center space-y-1">
              <p className="text-sm font-semibold text-yvy-dark">Como funciona?</p>
              <p className="text-xs text-yvy-muted leading-relaxed">
                Quando uma troca direta não é possível, o sistema encontra um ciclo de 3 moradores.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-yvy-accent/15 flex items-center justify-center text-[10px] font-bold text-yvy-accent">
                  1
                </span>
                <p className="text-xs text-yvy-text leading-relaxed">
                  <strong className="text-yvy-dark">Você dá</strong> figurinhas que outra pessoa
                  precisa
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] font-bold text-purple-600">
                  2
                </span>
                <p className="text-xs text-yvy-text leading-relaxed">
                  <strong className="text-yvy-dark">Essa pessoa dá</strong> figurinhas para um
                  terceiro morador
                </p>
              </div>
              <div className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-600">
                  3
                </span>
                <p className="text-xs text-yvy-text leading-relaxed">
                  <strong className="text-yvy-dark">O terceiro dá para você</strong> — fechando o
                  ciclo
                </p>
              </div>
            </div>

            <div className="bg-yvy-bg rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm">✨</span>
                <p className="text-[11px] text-yvy-muted leading-snug">
                  O sistema escolhe as figurinhas automaticamente — sem precisar selecionar nada
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">✅</span>
                <p className="text-[11px] text-yvy-muted leading-snug">
                  Os 3 participantes precisam aprovar para a troca acontecer
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">⚖️</span>
                <p className="text-[11px] text-yvy-muted leading-snug">
                  Troca equilibrada — todos dão e recebem a mesma quantidade
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isBusy || !canSearch}
            className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-md"
          >
            {searching ? 'Buscando combinações...' : 'Buscar Trocas Triangulares'}
          </button>
          {!canSearch && (
            <p className="text-xs text-yvy-muted text-center leading-relaxed">
              Nenhuma nova combinação disponível no momento. Suas figurinhas repetidas já estão
              comprometidas em trocas pendentes, ou não há ciclos possíveis com os outros moradores.
              Novas combinações podem surgir quando alguém atualizar suas repetidas ou quando uma
              troca pendente for concluída.
            </p>
          )}
          {searchMsg && <p className="text-xs text-yvy-muted text-center">{searchMsg}</p>}
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
              onClick={() => {
                setPreviews([])
                setSearchMsg(null)
              }}
              className="text-xs text-yvy-muted underline"
            >
              Voltar
            </button>
          </div>

          {searchMsg && <p className="text-xs text-red-600 text-center">{searchMsg}</p>}

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
                <div className="flex items-center gap-1.5">
                  {preview.previouslyCanceled && (
                    <span className="text-[10px] font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      Cancelada anteriormente
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-yvy-accent bg-yvy-accent/10 px-2 py-0.5 rounded-full">
                    {preview.score} figurinha{preview.score !== 1 ? 's' : ''} cada
                  </span>
                </div>
              </div>

              <div className="bg-rose-50/50 rounded-lg p-3 space-y-2 border border-rose-100">
                <p className="text-xs font-semibold text-rose-700">
                  Você dá {preview.aGivesIds.length} para{' '}
                  <span className="capitalize">{preview.userB.name}</span> →
                </p>
                <StickerList ids={preview.aGivesIds} label="" variant="giving" />
              </div>
              <div className="bg-green-50/50 rounded-lg p-3 space-y-2 border border-green-100">
                <p className="text-xs font-semibold text-green-700">
                  ← Você recebe {preview.cGivesIds.length} de{' '}
                  <span className="capitalize">{preview.userC.name}</span>
                </p>
                <StickerList ids={preview.cGivesIds} label="" variant="receiving" />
              </div>
              <div className="bg-sky-50/50 rounded-lg p-3 space-y-2 border border-sky-100">
                <p className="text-xs font-semibold text-sky-700">
                  <span className="capitalize">{preview.userB.name}</span> dá{' '}
                  {preview.bGivesIds.length} para{' '}
                  <span className="capitalize">{preview.userC.name}</span>
                </p>
                <StickerList ids={preview.bGivesIds} label="" variant="third-party" />
              </div>

              <button
                onClick={() => handleConfirm(idx)}
                disabled={isBusy}
                className="w-full bg-yvy-dark hover:bg-yvy-dark-hover text-yvy-gold font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {confirmingIdx === idx ? 'Enviando...' : 'Confirmar esta proposta'}
              </button>
            </div>
          ))}

          <p className="text-xs text-yvy-muted text-center leading-relaxed">
            Ao confirmar, os outros 2 participantes receberão a proposta e precisarão aprovar para a
            troca acontecer.
          </p>
        </div>
      )}

      {/* Completed trades — collapsible and paginated */}
      {completedTrades.length > 0 && (
        <CompletedTradesSection
          trades={completedTrades}
          userId={userId!}
          onRefresh={() => loadTrades(userId!)}
        />
      )}
    </div>
  )
}

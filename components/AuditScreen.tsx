'use client'

import { useEffect, useState } from 'react'
import { getAuditLog, AuditEntry } from '@/actions/getAuditLog'
import { getTradeLog } from '@/actions/getTradeLog'
import { rollbackTrade } from '@/actions/rollbackTrade'
import { isChromeSticker, isCocaColaSticker, sortByAlbumOrder, sortAlphabetically } from '@/lib/stickers'
import { usePrefs } from '@/contexts/PreferencesContext'
import { getTradeRollbackInfo } from '@/actions/getTradeRollbackInfo'
import { formatName } from '@/lib/format'

// ─── Event config ─────────────────────────────────────────────────────────────

type EventConfig = {
  icon: string
  borderColor: string
  iconBg: string
  iconColor: string
  label: (m: Record<string, unknown>) => string
  detail: (m: Record<string, unknown>) => string
  realLifeHint?: (m: Record<string, unknown>) => string
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  stickers_saved: {
    icon: '💾',
    borderColor: 'border-l-yvy-dark',
    iconBg: 'bg-yvy-dark/10',
    iconColor: 'text-yvy-dark',
    label: () => 'Álbum salvo',
    detail: (m) => {
      const total = m.total as number
      if (m.grouped) return `${total} figurinha${total !== 1 ? 's' : ''} no total`
      const added = (m.added as number | undefined) ?? 0
      const removed = (m.removed as number | undefined) ?? 0
      if (m.added === undefined && m.removed === undefined) {
        return `${total} figurinha${total !== 1 ? 's' : ''} no total`
      }
      const parts: string[] = []
      if (added > 0) parts.push(`+${added}`)
      if (removed > 0) parts.push(`−${removed}`)
      const delta = parts.length > 0 ? parts.join(' / ') : 'sem alterações'
      return `${delta} · ${total} no total`
    },
    realLifeHint: (m) => {
      if (m.grouped) return ''
      const added = (m.added as number | undefined) ?? 0
      const removed = (m.removed as number | undefined) ?? 0
      const hints: string[] = []
      if (added > 0)
        hints.push(
          `Cole ${added === 1 ? 'a figurinha nova' : `as ${added} figurinhas novas`} no álbum físico`
        )
      if (removed > 0)
        hints.push(
          `Verifique o álbum físico — ${removed === 1 ? '1 figurinha foi removida' : `${removed} figurinhas foram removidas`} por engano?`
        )
      return hints.join('\n')
    },
  },
  trade_sent: {
    icon: '📤',
    borderColor: 'border-l-yvy-accent',
    iconBg: 'bg-yvy-accent/10',
    iconColor: 'text-yvy-accent',
    label: () => `Pedido de troca enviado`,
    detail: (m) =>
      `Para ${m.partnerName} · ${m.givingCount || 0} dando, ${m.receivingCount || 0} recebendo`,
  },
  trade_accepted: {
    icon: '🤝',
    borderColor: 'border-l-[#16a34a]',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
    label: (m) => `Troca concluída com ${m.partnerName}`,
    detail: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      const g = giving.length || (m.givingCount as number) || 0
      const r = receiving.length || (m.receivingCount as number) || 0
      return `${g} dando · ${r} recebendo`
    },
    // realLifeHint is rendered as colored chips in EventCard for entries with sticker IDs
    realLifeHint: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      // only used for legacy entries that lack sticker ID arrays
      if (giving.length > 0 || receiving.length > 0) return ''
      return `Combine com ${m.partnerName} para trocar as figurinhas físicas`
    },
  },
  trade_rejected: {
    icon: '✕',
    borderColor: 'border-l-red-400',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    label: () => 'Troca recusada',
    detail: (m) => `Pedido de ${m.partnerName}`,
  },
  trade_cancelled: {
    icon: '○',
    borderColor: 'border-l-yvy-border',
    iconBg: 'bg-yvy-bg',
    iconColor: 'text-yvy-muted',
    label: () => 'Pedido cancelado',
    detail: (m) => `Para ${m.partnerName}`,
  },
  trade_rolled_back: {
    icon: '↩',
    borderColor: 'border-l-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    label: (m) => m.partial ? 'Troca parcialmente desfeita' : 'Troca desfeita',
    detail: (m) => `Com ${m.partnerName}`,
  },
  duplicate_updated: {
    icon: '＋',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: (m) => m.grouped ? 'Repetidas atualizadas' : 'Repetida atualizada',
    detail: (m) => m.grouped
      ? `${m.updateCount} figurinha${(m.updateCount as number) !== 1 ? 's' : ''}`
      : `${m.stickerId} · ${m.count} cópia${(m.count as number) !== 1 ? 's' : ''}`,
  },
  duplicate_removed: {
    icon: '−',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: (m) => m.grouped ? 'Repetidas removidas' : 'Repetida removida',
    detail: (m) => m.grouped
      ? `${m.updateCount} figurinha${(m.updateCount as number) !== 1 ? 's' : ''}`
      : `${m.stickerId}`,
  },
  file_import: {
    icon: '📥',
    borderColor: 'border-l-yvy-accent',
    iconBg: 'bg-yvy-accent/10',
    iconColor: 'text-yvy-accent',
    label: () => 'Álbum importado por arquivo',
    detail: (m) => {
      const total = m.total as number
      const dupItems = (m.duplicateItems as number) ?? 0
      const dupCopies = (m.duplicateCopies as number) ?? 0
      const failed = ((m.failedStickers as string[]) ?? []).length +
        ((m.failedDuplicates as string[]) ?? []).length
      const parts = [`${total} figurinha${total !== 1 ? 's' : ''} no álbum`]
      if (dupItems > 0)
        parts.push(`${dupItems} repetida${dupItems !== 1 ? 's' : ''} (${dupCopies} cópia${dupCopies !== 1 ? 's' : ''} extra)`)
      if (failed > 0) parts.push(`${failed} não salvo${failed !== 1 ? 's' : ''}`)
      return parts.join(' · ')
    },
    realLifeHint: (m) => {
      const added = (m.added as number) ?? 0
      const removed = (m.removed as number) ?? 0
      const failedStickers = (m.failedStickers as string[]) ?? []
      const failedDuplicates = (m.failedDuplicates as string[]) ?? []
      const hints: string[] = []
      if (added > 0)
        hints.push(
          `Cole ${added === 1 ? 'a figurinha nova' : `as ${added} figurinhas novas`} no álbum físico`
        )
      if (removed > 0)
        hints.push(
          `Verifique o álbum físico — ${removed} figurinha${removed !== 1 ? 's' : ''} foram removidas`
        )
      if (failedStickers.length > 0) {
        const MAX = 10
        const shown = failedStickers.slice(0, MAX).join(', ')
        const extra = failedStickers.length > MAX ? ` e mais ${failedStickers.length - MAX}` : ''
        hints.push(`Adicione manualmente ao álbum: ${shown}${extra}`)
      }
      if (failedDuplicates.length > 0) {
        const MAX = 10
        const shown = failedDuplicates.slice(0, MAX).join(', ')
        const extra = failedDuplicates.length > MAX ? ` e mais ${failedDuplicates.length - MAX}` : ''
        hints.push(`Adicione manualmente às repetidas: ${shown}${extra}`)
      }
      return hints.join('\n')
    },
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  if (hours < 24) return `há ${hours}h`
  if (days === 1) return 'há 1 dia'
  return `há ${days} dias`
}

function absoluteTime(dateStr: string): string {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 12 * 60 * 60 * 1000
}

function groupByDay(entries: AuditEntry[]): { day: string; entries: AuditEntry[] }[] {
  const groups: { day: string; entries: AuditEntry[] }[] = []
  for (const entry of entries) {
    const day = dayLabel(entry.created_at)
    const last = groups[groups.length - 1]
    if (last && last.day === day) {
      last.entries.push(entry)
    } else {
      groups.push({ day, entries: [entry] })
    }
  }
  return groups
}

// ─── Rollback control (history) ──────────────────────────────────────────────

type RollbackStep = 'closed' | 'loading-info' | 'choose-mode' | 'select-stickers' | 'requesting' | 'requested' | 'waiting' | 'confirm-other'

function RollbackControl({
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
      if (!info.found) { setMsg('Troca não encontrada.'); setStep('closed'); return }
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
      if (result.success) setStep('requested')
      else { setMsg(result.error) }
    } catch { setMsg('Erro inesperado.') }
    finally { setSubmitting(false) }
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
      if (result.success) setStep('requested')
      else { setMsg(result.error) }
    } catch { setMsg('Erro inesperado.') }
    finally { setSubmitting(false) }
  }

  async function respond(action: 'confirm' | 'deny') {
    setSubmitting(true)
    setMsg(null)
    try {
      const result = await rollbackTrade(tradeId, userId, action)
      if (result.success) setStep(action === 'deny' ? 'closed' : 'requested')
      else { setMsg(result.error) }
    } catch { setMsg('Erro inesperado.') }
    finally { setSubmitting(false) }
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
          {isPartial ? 'Desfazimento parcial aguardando confirmação.' : 'Desfazimento aguardando confirmação.'}
        </p>
        {isPartial && pendingGiving && pendingGiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">Figurinhas que você deu: {sort(pendingGiving).join(', ')}</p>
        )}
        {isPartial && pendingReceiving && pendingReceiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">Figurinhas que você recebeu: {sort(pendingReceiving).join(', ')}</p>
        )}
      </div>
    )
  }

  if (step === 'confirm-other') {
    const isPartial = pendingGiving !== null || pendingReceiving !== null
    return (
      <div className="mt-1.5 space-y-2">
        <p className="text-[11px] text-amber-700 font-medium">
          {partnerName.split(' ')[0]} quer {isPartial ? 'desfazer parcialmente' : 'desfazer'} esta troca.
        </p>
        {isPartial && pendingGiving && pendingGiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">Você recuperará: {sort(pendingGiving).join(', ')}</p>
        )}
        {isPartial && pendingReceiving && pendingReceiving.length > 0 && (
          <p className="text-[11px] text-yvy-muted">Você devolverá: {sort(pendingReceiving).join(', ')}</p>
        )}
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button onClick={() => respond('deny')} className="flex-1 border border-yvy-border text-yvy-text font-semibold py-1.5 rounded-lg text-xs transition-colors hover:bg-yvy-bg">
            Manter troca
          </button>
          <button onClick={() => respond('confirm')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors">
            Confirmar desfazimento
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
          <button onClick={requestFull} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 rounded-lg text-xs transition-colors">
            Desfazer tudo
          </button>
          <button onClick={() => setStep('select-stickers')} className="flex-1 border border-amber-400 text-amber-700 font-semibold py-1.5 rounded-lg text-xs hover:bg-amber-50 transition-colors">
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
            <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">Você deu</p>
            <div className="flex flex-wrap gap-1">
              {sortedGiving.map((id) => {
                const sel = selectedGiving.has(id)
                return (
                  <button key={id} type="button"
                    onClick={() => setSelectedGiving((p) => { const n = new Set(p); sel ? n.delete(id) : n.add(id); return n })}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${sel ? 'bg-amber-500 border-amber-500 text-white font-semibold' : 'bg-yvy-bg border-yvy-border text-yvy-text hover:border-amber-400'}`}
                  >
                    {id}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {sortedReceiving.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-yvy-muted mb-1">Você recebeu</p>
            <div className="flex flex-wrap gap-1">
              {sortedReceiving.map((id) => {
                const sel = selectedReceiving.has(id)
                return (
                  <button key={id} type="button"
                    onClick={() => setSelectedReceiving((p) => { const n = new Set(p); sel ? n.delete(id) : n.add(id); return n })}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-colors ${sel ? 'bg-amber-500 border-amber-500 text-white font-semibold' : 'bg-yvy-bg border-yvy-border text-yvy-text hover:border-amber-400'}`}
                  >
                    {id}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        {msg && <p className="text-[11px] text-red-600">{msg}</p>}
        <div className="flex gap-2">
          <button onClick={() => setStep('choose-mode')} className="border border-yvy-border text-yvy-text font-semibold px-3 py-1.5 rounded-lg text-xs hover:bg-yvy-bg transition-colors">
            ← Voltar
          </button>
          <button onClick={requestPartial} disabled={!hasSelection || submitting}
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

// ─── Trade assistant ─────────────────────────────────────────────────────────

function StickerChip({
  id,
  variant,
  checked,
  onToggle,
}: {
  id: string
  variant: 'giving' | 'receiving'
  checked: boolean
  onToggle?: () => void
}) {
  const isChrome = isChromeSticker(id)
  const isCoke = isCocaColaSticker(id)

  const base = 'relative text-sm font-mono font-semibold px-3 py-1.5 rounded-lg border-2 transition-all select-none'
  const activeGiving = 'bg-rose-50 border-rose-300 text-rose-700'
  const doneGiving = 'bg-rose-100 border-rose-200 text-rose-300 line-through opacity-50'
  const activeReceiving = 'bg-green-50 border-green-300 text-green-700'
  const doneReceiving = 'bg-green-100 border-green-200 text-green-300 line-through opacity-50'

  const colorClass = checked
    ? variant === 'giving' ? doneGiving : doneReceiving
    : variant === 'giving' ? activeGiving : activeReceiving

  const label = isChrome ? `✨${id}` : isCoke ? id : id

  if (onToggle) {
    return (
      <button type="button" onClick={onToggle} className={`${base} ${colorClass}`}>
        {isChrome ? <span className={checked ? '' : 'text-amber-500'}>{label}</span> : label}
        {checked && (
          <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center ${variant === 'giving' ? 'bg-rose-400' : 'bg-green-500'}`}>
            ✓
          </span>
        )}
      </button>
    )
  }

  return (
    <span className={`${base} ${colorClass} cursor-default`}>
      {isChrome ? <span className={checked ? '' : 'text-amber-500'}>{label}</span> : label}
    </span>
  )
}

function TradeAssistant({
  partnerName,
  givingIds,
  receivingIds,
  onClose,
}: {
  partnerName: string
  givingIds: string[]
  receivingIds: string[]
  onClose: () => void
}) {
  const [checkedGiving, setCheckedGiving] = useState<Set<string>>(new Set())
  const [checkedReceiving, setCheckedReceiving] = useState<Set<string>>(new Set())
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically
  const sortedGiving = sort(givingIds)
  const sortedReceiving = sort(receivingIds)

  function toggleGiving(id: string) {
    setCheckedGiving((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleReceiving(id: string) {
    setCheckedReceiving((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const allGivingDone = givingIds.length > 0 && checkedGiving.size === givingIds.length
  const allReceivingDone = receivingIds.length > 0 && checkedReceiving.size === receivingIds.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-yvy-surface rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-yvy-border shrink-0">
          <div>
            <p className="text-sm font-bold text-yvy-dark">Assistente de troca</p>
            <p className="text-[11px] text-yvy-muted">Toque para marcar cada figurinha separada</p>
          </div>
          <button onClick={onClose} className="text-yvy-muted text-xl leading-none px-1">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {givingIds.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-500">
                  Você vai dar →
                </p>
                <p className={`text-[11px] font-medium ${allGivingDone ? 'text-green-600' : 'text-yvy-muted'}`}>
                  {allGivingDone ? 'Tudo separado ✓' : `${checkedGiving.size}/${givingIds.length} separadas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedGiving.map((id) => (
                  <StickerChip
                    key={id}
                    id={id}
                    variant="giving"
                    checked={checkedGiving.has(id)}
                    onToggle={() => toggleGiving(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {receivingIds.length > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wide text-green-600">
                  ← Você vai receber
                </p>
                <p className={`text-[11px] font-medium ${allReceivingDone ? 'text-green-600' : 'text-yvy-muted'}`}>
                  {allReceivingDone ? 'Tudo conferido ✓' : `${checkedReceiving.size}/${receivingIds.length} conferidas`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {sortedReceiving.map((id) => (
                  <StickerChip
                    key={id}
                    id={id}
                    variant="receiving"
                    checked={checkedReceiving.has(id)}
                    onToggle={() => toggleReceiving(id)}
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full border border-yvy-border text-yvy-text font-semibold py-3 rounded-xl text-sm mt-2"
          >
            Fechar assistente
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Event card ───────────────────────────────────────────────────────────────

const TRADE_ACTIONS = new Set([
  'trade_accepted', 'trade_sent', 'trade_rejected', 'trade_cancelled', 'trade_rolled_back',
])

function EventCard({ entry, userId }: { entry: AuditEntry; userId: string }) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const [assistantOpen, setAssistantOpen] = useState(false)
  const { stickerOrder } = usePrefs()
  const sort = stickerOrder === 'album' ? sortByAlbumOrder : sortAlphabetically

  const isTrade = TRADE_ACTIONS.has(entry.action)
  const isAccepted = entry.action === 'trade_accepted'

  // Normalize partnerName in metadata so legacy (pre-formatName) entries display correctly
  const normalizedMetadata = entry.metadata.partnerName
    ? { ...entry.metadata, partnerName: formatName(formatName(entry.metadata.partnerName as string)) }
    : entry.metadata

  const label = cfg.label(normalizedMetadata)
  const detail = cfg.detail(normalizedMetadata)
  const hint = cfg.realLifeHint?.(normalizedMetadata)

  const tradeId = isAccepted ? (entry.metadata.tradeId as string | undefined) : undefined

  const givingIds = sort((entry.metadata.givingIds as string[] | undefined) ?? [])
  const receivingIds = sort((entry.metadata.receivingIds as string[] | undefined) ?? [])
  const hasTradeStickers = isAccepted && (givingIds.length > 0 || receivingIds.length > 0)

  // ── Compact row for non-trade events ──────────────────────────────────────
  if (!isTrade) {
    return (
      <div className="space-y-1 py-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm shrink-0 leading-none">{cfg.icon}</span>
          <span className="text-xs flex-1 min-w-0 leading-snug">
            <span className="font-medium text-yvy-dark/60">{label}</span>
            <span className="text-yvy-muted"> · {detail}</span>
          </span>
          <div className="flex flex-col items-end shrink-0 gap-px">
            <span className="text-[10px] text-yvy-muted/70">{relativeTime(entry.created_at)}</span>
            <span className="text-[9px] text-yvy-muted/40">{absoluteTime(entry.created_at)}</span>
          </div>
        </div>
        {hint && isRecent(entry.created_at) && hint.split('\n').filter(Boolean).map((h, i) => (
          <div key={i} className="flex items-start gap-1 pl-5">
            <span className="text-amber-400 text-[10px] shrink-0 mt-px">⚑</span>
            <p className="text-[11px] text-amber-600 leading-snug">{h}</p>
          </div>
        ))}
      </div>
    )
  }

  // ── Prominent card for trade events ───────────────────────────────────────
  return (
    <div
      className={`flex gap-3 pl-3 py-2 rounded-r-md ${
        isAccepted
          ? 'border-l-[4px] border-l-[#16a34a] bg-green-50/50'
          : `border-l-[3px] ${cfg.borderColor}`
      }`}
    >
      {/* Icon */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-yvy-dark leading-snug">{label}</p>
          <div className="flex flex-col items-end shrink-0 mt-0.5 gap-0.5">
            <span className="text-[10px] text-yvy-muted">{relativeTime(entry.created_at)}</span>
            <span className="text-[10px] text-yvy-muted/60">{absoluteTime(entry.created_at)}</span>
          </div>
        </div>
        <p className="text-xs text-yvy-muted mt-0.5">{detail}</p>

        {/* Colored sticker chips for trade_accepted entries */}
        {hasTradeStickers && (
          <div className="mt-2 space-y-2.5">
            {isRecent(entry.created_at) && (
              <div className="flex items-center gap-1.5">
                <span className="text-amber-500 text-[10px] shrink-0">⚑</span>
                <span className="text-[11px] text-amber-700 font-medium">
                  Combine com {formatName(entry.metadata.partnerName as string)} para trocar fisicamente
                </span>
              </div>
            )}

            {givingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500 mb-1.5">
                  Você dá →
                </p>
                <div className="flex flex-wrap gap-1">
                  {givingIds.map((id) => (
                    <span
                      key={id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700"
                    >
                      {isChromeSticker(id) ? <span className="font-bold text-amber-500">{id}</span> : isCocaColaSticker(id) ? <span className="font-bold text-red-500">{id}</span> : id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {receivingIds.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-green-600 mb-1.5">
                  ← Você recebe
                </p>
                <div className="flex flex-wrap gap-1">
                  {receivingIds.map((id) => (
                    <span
                      key={id}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-green-50 border border-green-200 text-green-700"
                    >
                      {isChromeSticker(id) ? <span className="font-bold text-amber-500">{id}</span> : isCocaColaSticker(id) ? <span className="font-bold text-red-500">{id}</span> : id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setAssistantOpen(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yvy-accent text-white text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <span>📋</span>
              Assistente de troca
            </button>
          </div>
        )}

        {/* Legacy text hint for entries without sticker ID arrays */}
        {hint && !hasTradeStickers && isRecent(entry.created_at) && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <span className="text-amber-500 text-[10px] shrink-0 mt-px">⚑</span>
            <p className="text-[11px] text-amber-700 font-medium leading-snug whitespace-pre-line">
              {hint}
            </p>
          </div>
        )}

        {/* Rollback control for accepted trades */}
        {tradeId && (
          <RollbackControl
            tradeId={tradeId}
            userId={userId}
            partnerName={formatName(entry.metadata.partnerName as string)}
            givingIds={givingIds}
            receivingIds={receivingIds}
          />
        )}
      </div>

      {assistantOpen && hasTradeStickers && (
        <TradeAssistant
          partnerName={formatName(entry.metadata.partnerName as string)}
          givingIds={givingIds}
          receivingIds={receivingIds}
          onClose={() => setAssistantOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const TRADE_PAGE_SIZE = 3
const ACTIVITY_PAGE_SIZE = 10

function consolidateActivity(entries: AuditEntry[]): AuditEntry[] {
  const dayCounts = new Map<string, number>()
  for (const e of entries) {
    const key = `${e.created_at.slice(0, 10)}:${e.action}`
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }

  const seen = new Set<string>()
  const result: AuditEntry[] = []
  for (const e of entries) {
    if (e.action === 'file_import') { result.push(e); continue }
    const key = `${e.created_at.slice(0, 10)}:${e.action}`
    if (seen.has(key)) continue
    seen.add(key)
    const count = dayCounts.get(key) ?? 1
    if (count > 1 && (e.action === 'duplicate_updated' || e.action === 'duplicate_removed')) {
      result.push({ ...e, metadata: { grouped: true, updateCount: count } })
    } else if (count > 1 && e.action === 'stickers_saved') {
      result.push({ ...e, metadata: { ...e.metadata, grouped: true } })
    } else {
      result.push(e)
    }
  }
  return result
}

export default function AuditScreen() {
  const [tradeEntries, setTradeEntries] = useState<AuditEntry[]>([])
  const [activityEntries, setActivityEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tradePage, setTradePage] = useState(0)
  const [activityPage, setActivityPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const uid = localStorage.getItem('userId') ?? ''
    setUserId(uid)
    if (!uid) { setLoading(false); return }
    Promise.all([
      getTradeLog(uid),
      getAuditLog(uid).catch(() => [] as AuditEntry[]),
    ])
      .then(([trades, activity]) => {
        setTradeEntries(trades)
        setActivityEntries(consolidateActivity(activity))
      })
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando histórico...</p>
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>Você precisa se identificar primeiro.</p>
        <a href="/" className="text-yvy-accent underline mt-2 inline-block">
          Ir para o cadastro
        </a>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-center text-yvy-muted">
        <p>{error}</p>
      </div>
    )
  }

  const tradeTotalPages = Math.max(1, Math.ceil(tradeEntries.length / TRADE_PAGE_SIZE))
  const tradePageEntries = tradeEntries.slice(tradePage * TRADE_PAGE_SIZE, tradePage * TRADE_PAGE_SIZE + TRADE_PAGE_SIZE)

  const activityTotalPages = Math.max(1, Math.ceil(activityEntries.length / ACTIVITY_PAGE_SIZE))
  const activityPageEntries = activityEntries.slice(activityPage * ACTIVITY_PAGE_SIZE, activityPage * ACTIVITY_PAGE_SIZE + ACTIVITY_PAGE_SIZE)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
        Histórico
      </h2>

      {/* ── Trocas ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-bold text-yvy-dark uppercase tracking-wide">Trocas</h3>
          {tradeEntries.length > 0 && (
            <span className="text-xs text-yvy-muted">
              {tradeEntries.length} registro{tradeEntries.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {tradeEntries.length === 0 ? (
          <div className="text-center py-8 text-yvy-muted bg-yvy-bg rounded-xl border border-yvy-border">
            <p className="text-sm">Nenhuma troca registrada ainda.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {groupByDay(tradePageEntries).map(({ day, entries: dayEntries }) => (
                <div key={day}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted">{day}</span>
                    <div className="flex-1 h-px bg-yvy-border" />
                  </div>
                  <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md px-4 py-3 space-y-4">
                    {dayEntries.map((entry) => (
                      <EventCard key={entry.id} entry={entry} userId={userId} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {tradeTotalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => setTradePage((p) => Math.max(0, p - 1))}
                  disabled={tradePage === 0}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-yvy-muted border border-yvy-border hover:bg-yvy-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-yvy-muted">{tradePage + 1} / {tradeTotalPages}</span>
                <button
                  onClick={() => setTradePage((p) => Math.min(tradeTotalPages - 1, p + 1))}
                  disabled={tradePage === tradeTotalPages - 1}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-yvy-muted border border-yvy-border hover:bg-yvy-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Atividade ────────────────────────────────────────────────── */}
      {activityEntries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted/70">Atividade</h3>

          <div className="space-y-4">
            {groupByDay(activityPageEntries).map(({ day, entries: dayEntries }) => (
              <div key={day}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted/60">{day}</span>
                  <div className="flex-1 h-px bg-yvy-border/60" />
                </div>
                <div className="bg-yvy-bg rounded-xl border border-yvy-border px-4 py-2.5 space-y-2 divide-y divide-yvy-border/50">
                  {dayEntries.filter((e) => EVENT_CONFIG[e.action]).map((entry) => (
                    <div key={entry.id} className="pt-2 first:pt-0">
                      <EventCard entry={entry} userId={userId} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {activityTotalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
                disabled={activityPage === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-yvy-muted border border-yvy-border hover:bg-yvy-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-yvy-muted">{activityPage + 1} / {activityTotalPages}</span>
              <button
                onClick={() => setActivityPage((p) => Math.min(activityTotalPages - 1, p + 1))}
                disabled={activityPage === activityTotalPages - 1}
                className="px-4 py-2 rounded-lg text-sm font-medium text-yvy-muted border border-yvy-border hover:bg-yvy-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

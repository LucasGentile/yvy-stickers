'use client'

import { useEffect, useState } from 'react'
import { getAuditLog, AuditEntry } from '@/actions/getAuditLog'
import { rollbackTrade } from '@/actions/rollbackTrade'

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
      const added = (m.added as number | undefined) ?? 0
      const removed = (m.removed as number | undefined) ?? 0
      if (m.added === undefined && m.removed === undefined) {
        // legacy entries that only have total
        return `${total} figurinha${total !== 1 ? 's' : ''} no total`
      }
      const parts: string[] = []
      if (added > 0) parts.push(`+${added}`)
      if (removed > 0) parts.push(`−${removed}`)
      const delta = parts.length > 0 ? parts.join(' / ') : 'sem alterações'
      return `${delta} · ${total} no total`
    },
    realLifeHint: (m) => {
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
      // backwards compat: old entries only had counts
      const g = giving.length || (m.givingCount as number) || 0
      const r = receiving.length || (m.receivingCount as number) || 0
      return `${g} dando · ${r} recebendo`
    },
    realLifeHint: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      const lines: string[] = [`Combine com ${m.partnerName} para trocar as figurinhas físicas`]
      if (giving.length > 0) lines.push(`Dar: ${giving.join(', ')}`)
      if (receiving.length > 0) lines.push(`Receber: ${receiving.join(', ')}`)
      return lines.join('\n')
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
    label: () => 'Troca desfeita',
    detail: (m) => `Com ${m.partnerName}`,
  },
  duplicate_updated: {
    icon: '＋',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: () => 'Repetida atualizada',
    detail: (m) => `${m.stickerId} · ${m.count} cópia${(m.count as number) !== 1 ? 's' : ''}`,
  },
  duplicate_removed: {
    icon: '−',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: () => 'Repetida removida',
    detail: (m) => `${m.stickerId}`,
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

// ─── Rollback button ──────────────────────────────────────────────────────────

const ROLLBACK_WINDOW_MS = 10 * 60 * 1000

function RollbackButton({
  tradeId,
  userId,
  acceptedAt,
}: {
  tradeId: string
  userId: string
  acceptedAt: string
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState<string | null>(null)

  const elapsed = Date.now() - new Date(acceptedAt).getTime()
  const remaining = Math.ceil((ROLLBACK_WINDOW_MS - elapsed) / 60000)

  if (elapsed >= ROLLBACK_WINDOW_MS) return null

  if (status === 'done') {
    return (
      <p className="text-[11px] text-amber-700 font-medium mt-1.5">
        Solicitação enviada — aguardando confirmação do outro participante.
      </p>
    )
  }

  return (
    <div className="mt-1.5 space-y-1">
      <p className="text-[11px] text-yvy-muted">
        Disponível para desfazer por mais {remaining} min (requer confirmação de ambos).
      </p>
      {msg && <p className="text-[11px] text-red-600">{msg}</p>}
      <button
        disabled={status === 'loading'}
        onClick={async () => {
          setStatus('loading')
          setMsg(null)
          try {
            const result = await rollbackTrade(tradeId, userId, 'request')
            if (result.success) {
              setStatus('done')
            } else {
              setMsg(result.error)
              setStatus('idle')
            }
          } catch {
            setMsg('Erro inesperado.')
            setStatus('idle')
          }
        }}
        className="text-[11px] text-amber-600 underline disabled:opacity-50"
      >
        {status === 'loading' ? 'Solicitando...' : 'Desfazer troca'}
      </button>
    </div>
  )
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ entry, userId }: { entry: AuditEntry; userId: string }) {
  const cfg = EVENT_CONFIG[entry.action]
  if (!cfg) return null

  const label = cfg.label(entry.metadata)
  const detail = cfg.detail(entry.metadata)
  const hint = cfg.realLifeHint?.(entry.metadata)

  const tradeId = entry.action === 'trade_accepted'
    ? (entry.metadata.tradeId as string | undefined)
    : undefined

  return (
    <div className={`flex gap-3 border-l-[3px] pl-3 py-1 ${cfg.borderColor}`}>
      {/* Icon */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${cfg.iconBg} ${cfg.iconColor}`}
      >
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-yvy-dark leading-snug">{label}</p>
          <span className="text-[10px] text-yvy-muted shrink-0 mt-0.5">
            {relativeTime(entry.created_at)}
          </span>
        </div>
        <p className="text-xs text-yvy-muted mt-0.5">{detail}</p>

        {/* Real-life checklist hint */}
        {hint && (
          <div className="mt-1.5 flex items-start gap-1.5">
            <span className="text-amber-500 text-[10px] shrink-0 mt-px">⚑</span>
            <p className="text-[11px] text-amber-700 font-medium leading-snug whitespace-pre-line">
              {hint}
            </p>
          </div>
        )}

        {/* Rollback button for recent accepted trades */}
        {tradeId && (
          <RollbackButton tradeId={tradeId} userId={userId} acceptedAt={entry.created_at} />
        )}
      </div>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

export default function AuditScreen() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const uid = localStorage.getItem('userId') ?? ''
    setUserId(uid)
    if (!uid) {
      setLoading(false)
      return
    }
    getAuditLog(uid)
      .then(setEntries)
      .catch(() => setError('Erro ao carregar histórico.'))
      .finally(() => setLoading(false))
  }, [])

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-yvy-muted">
        <p>Carregando histórico...</p>
      </div>
    )
  }

  if (!userId && !loading) {
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-yvy-dark border-l-[3px] border-yvy-dark pl-2.5 [text-shadow:0_1px_3px_rgba(0,0,0,0.22)]">
          Histórico
        </h2>
        <span className="text-xs text-yvy-muted">Últimas {entries.length} ações</span>
      </div>

      {/* What this page is for */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-semibold">Para usar como checklist:</span> revise as ações marcadas
          com <span className="text-amber-500 font-bold">⚑</span> para confirmar que você já as
          realizou no álbum físico.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16 text-yvy-muted space-y-2">
          <p className="text-base">Nenhuma ação registrada ainda.</p>
          <p className="text-sm">As ações aparecerão aqui à medida que você usar o app.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupByDay(pageEntries).map(({ day, entries: dayEntries }) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-yvy-muted">
                  {day}
                </span>
                <div className="flex-1 h-px bg-yvy-border" />
              </div>
              <div className="bg-yvy-surface rounded-xl border border-yvy-border shadow-md px-4 py-3 space-y-4">
                {dayEntries.map((entry) => (
                  <EventCard key={entry.id} entry={entry} userId={userId} />
                ))}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg text-sm font-medium text-yvy-muted border border-yvy-border hover:bg-yvy-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Anterior
              </button>
              <span className="text-xs text-yvy-muted">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
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

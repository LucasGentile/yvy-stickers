import type { AuditEntry } from '@/actions/getAuditLog'

export type EventConfig = {
  icon: string
  borderColor: string
  iconBg: string
  iconColor: string
  label: (m: Record<string, unknown>) => string
  detail: (m: Record<string, unknown>) => string
  realLifeHint?: (m: Record<string, unknown>) => string
}

export const EVENT_CONFIG: Record<string, EventConfig> = {
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
    label: (m) =>
      m.isPartial ? `Troca parcial com ${m.partnerName}` : `Troca concluída com ${m.partnerName}`,
    detail: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      const g = giving.length || (m.givingCount as number) || 0
      const r = receiving.length || (m.receivingCount as number) || 0
      const base = `${g} dando · ${r} recebendo`
      if (!m.isPartial) return base
      const exG = ((m.excludedGivingIds as string[] | undefined) ?? []).length
      const exR = ((m.excludedReceivingIds as string[] | undefined) ?? []).length
      return `${base} · ${exG + exR} removida${exG + exR !== 1 ? 's' : ''} da proposta`
    },
    realLifeHint: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      if (giving.length > 0 || receiving.length > 0) return ''
      return `Combine com ${m.partnerName} para trocar as figurinhas físicas`
    },
  },
  trade_rejected: {
    icon: '✕',
    borderColor: 'border-l-red-400',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    label: (m) => (m.rejectedBy ? `Troca recusada por ${m.rejectedBy}` : 'Troca recusada'),
    detail: (m) => `Com ${m.partnerName}`,
  },
  trade_received: {
    icon: '📥',
    borderColor: 'border-l-yvy-accent',
    iconBg: 'bg-yvy-accent/10',
    iconColor: 'text-yvy-accent',
    label: () => 'Pedido de troca recebido',
    detail: (m) =>
      `De ${m.partnerName} · ${m.receivingCount || 0} recebendo, ${m.givingCount || 0} dando`,
  },
  trade_cancelled: {
    icon: '○',
    borderColor: 'border-l-yvy-border',
    iconBg: 'bg-yvy-bg',
    iconColor: 'text-yvy-muted',
    label: (m) => (m.cancelledBy ? `Pedido cancelado por ${m.cancelledBy}` : 'Pedido cancelado'),
    detail: (m) => `Com ${m.partnerName}`,
  },
  trade_rolled_back: {
    icon: '↩',
    borderColor: 'border-l-amber-400',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    label: (m) =>
      m.forcedBy
        ? `Desfazimento forçado por ${m.forcedBy}`
        : m.partial
          ? 'Troca parcialmente desfeita'
          : 'Troca desfeita',
    detail: (m) => `Com ${m.partnerName}`,
  },
  trade_rollback_requested: {
    icon: '⏳',
    borderColor: 'border-l-amber-300',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    label: (m) => (m.partial ? 'Desfazimento parcial solicitado' : 'Desfazimento solicitado'),
    detail: (m) => `${m.requestedBy} pediu para desfazer a troca com ${m.partnerName}`,
  },
  trade_rollback_denied: {
    icon: '🚫',
    borderColor: 'border-l-yvy-border',
    iconBg: 'bg-yvy-bg',
    iconColor: 'text-yvy-muted',
    label: () => 'Desfazimento recusado',
    detail: (m) => `${m.deniedBy} manteve a troca com ${m.partnerName}`,
  },
  advanced_trade_proposed: {
    icon: '🔄',
    borderColor: 'border-l-purple-400',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    label: (m) => (m.isRequester ? 'Troca triangular proposta' : 'Troca triangular recebida'),
    detail: (m) => `Com ${((m.partners as string[]) ?? []).join(' e ')}`,
  },
  advanced_trade_approved: {
    icon: '✓',
    borderColor: 'border-l-purple-400',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    label: (m) =>
      (m.isSelf ?? !m.approvedBy)
        ? 'Você aprovou a troca triangular'
        : `${m.approvedBy} aprovou a troca triangular`,
    detail: (m) => `Com ${((m.partners as string[]) ?? []).join(' e ')}`,
  },
  advanced_trade_rejected: {
    icon: '✕',
    borderColor: 'border-l-red-400',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    label: () => 'Troca triangular recusada',
    detail: (m) =>
      `${m.rejectedBy ?? 'Alguém'} recusou · com ${((m.partners as string[]) ?? []).join(' e ')}`,
  },
  advanced_trade_executed: {
    icon: '🤝',
    borderColor: 'border-l-[#16a34a]',
    iconBg: 'bg-green-50',
    iconColor: 'text-green-700',
    label: (m) => `Troca triangular concluída com ${((m.partners as string[]) ?? []).join(' e ')}`,
    detail: (m) => {
      const giving = (m.givingIds as string[] | undefined) ?? []
      const receiving = (m.receivingIds as string[] | undefined) ?? []
      const parts: string[] = []
      if (giving.length > 0) parts.push(`${giving.length} para ${m.giveToName ?? 'alguém'}`)
      if (receiving.length > 0)
        parts.push(`${receiving.length} de ${m.receiveFromName ?? 'alguém'}`)
      return parts.join(' · ')
    },
  },
  advanced_trade_cancelled: {
    icon: '○',
    borderColor: 'border-l-yvy-border',
    iconBg: 'bg-yvy-bg',
    iconColor: 'text-yvy-muted',
    label: () => 'Troca triangular cancelada',
    detail: (m) =>
      `${m.cancelledBy ?? 'Alguém'} cancelou · com ${((m.partners as string[]) ?? []).join(' e ')}`,
  },
  duplicate_updated: {
    icon: '＋',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: (m) => (m.grouped ? 'Repetidas atualizadas' : 'Repetida atualizada'),
    detail: (m) =>
      m.grouped
        ? `${m.updateCount} figurinha${(m.updateCount as number) !== 1 ? 's' : ''}`
        : `${m.stickerId} · ${m.count} cópia${(m.count as number) !== 1 ? 's' : ''}`,
  },
  duplicate_removed: {
    icon: '−',
    borderColor: 'border-l-yvy-gold',
    iconBg: 'bg-yvy-gold/10',
    iconColor: 'text-yvy-gold',
    label: (m) => (m.grouped ? 'Repetidas removidas' : 'Repetida removida'),
    detail: (m) =>
      m.grouped
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
      const totalLines = (m.totalLines as number | undefined) ?? total
      const dupItems = (m.duplicateItems as number) ?? 0
      const dupCopies = (m.duplicateCopies as number) ?? 0
      const failed =
        ((m.failedStickers as string[]) ?? []).length +
        ((m.failedDuplicates as string[]) ?? []).length
      const parts: string[] = []
      if (totalLines !== total)
        parts.push(`${totalLines} linha${totalLines !== 1 ? 's' : ''} no arquivo`)
      parts.push(`${total} figurinha${total !== 1 ? 's' : ''} únicas no álbum`)
      if (dupItems > 0)
        parts.push(
          `${dupItems} com repetida${dupItems !== 1 ? 's' : ''} (${dupCopies} cópia${dupCopies !== 1 ? 's' : ''} extra)`
        )
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
        const extra =
          failedDuplicates.length > MAX ? ` e mais ${failedDuplicates.length - MAX}` : ''
        hints.push(`Adicione manualmente às repetidas: ${shown}${extra}`)
      }
      return hints.join('\n')
    },
  },
}

export const TRADE_ACTIONS = new Set([
  'trade_accepted',
  'trade_sent',
  'trade_received',
  'trade_rejected',
  'trade_cancelled',
  'trade_rolled_back',
  'trade_rollback_requested',
  'trade_rollback_denied',
  'advanced_trade_proposed',
  'advanced_trade_approved',
  'advanced_trade_rejected',
  'advanced_trade_executed',
  'advanced_trade_cancelled',
])

export function dayLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
}

export function relativeTime(dateStr: string): string {
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

export function absoluteTime(dateStr: string): string {
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 12 * 60 * 60 * 1000
}

export function groupByDay(entries: AuditEntry[]): { day: string; entries: AuditEntry[] }[] {
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

export function consolidateActivity(entries: AuditEntry[]): AuditEntry[] {
  const dayCounts = new Map<string, number>()
  for (const e of entries) {
    const key = `${e.created_at.slice(0, 10)}:${e.action}`
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  }
  const seen = new Set<string>()
  const result: AuditEntry[] = []
  for (const e of entries) {
    if (e.action === 'file_import') {
      result.push(e)
      continue
    }
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

'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'

const TOTAL = ALL_STICKER_IDS.length
const PACK_SIZE = 7
const PACK_PRICE = 7 // R$7 per pack

export type Insight = {
  id: string
  emoji: string
  title: string
  highlight: string // bold line — the main punchline
  detail: string // secondary fun line
  color: 'red' | 'orange' | 'amber' | 'green' | 'blue' | 'purple' | 'pink' | 'teal'
}

function estimatedSpend(stickers: number, dupes: number): number {
  return Math.ceil((stickers + dupes) / PACK_SIZE) * PACK_PRICE
}

export async function getMuralInsights(): Promise<Insight[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: users },
    { data: stickerCounts },
    { data: dupeRows },
    { data: acceptedTrades },
    { data: pendingTrades },
    { data: auditRows },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').eq('approved', true),
    (supabaseAdmin as any).rpc('get_sticker_counts_by_user'),
    supabaseAdmin.from('user_duplicates').select('user_id, count').limit(2000),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id')
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id')
      .eq('status', 'pending'),
    supabaseAdmin
      .from('audit_log')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo)
      .limit(2000),
  ])

  if (!users || users.length === 0) return []

  const nameMap = Object.fromEntries(users.map((u) => [u.id, u.name as string]))

  // Sticker count per user
  const stickerMap: Record<string, number> = {}
  for (const row of stickerCounts ?? []) stickerMap[row.user_id] = Number(row.sticker_count)

  // Total dupe copies per user
  const dupeMap: Record<string, number> = {}
  for (const row of dupeRows ?? []) {
    dupeMap[row.user_id] = (dupeMap[row.user_id] ?? 0) + row.count
  }

  // Trade count per user (accepted)
  const tradeMap: Record<string, number> = {}
  for (const t of acceptedTrades ?? []) {
    tradeMap[t.initiator_id] = (tradeMap[t.initiator_id] ?? 0) + 1
    tradeMap[t.receiver_id] = (tradeMap[t.receiver_id] ?? 0) + 1
  }
  const totalTrades = (acceptedTrades ?? []).length

  // Pending trade count per user
  const pendingMap: Record<string, number> = {}
  for (const t of pendingTrades ?? []) {
    pendingMap[t.initiator_id] = (pendingMap[t.initiator_id] ?? 0) + 1
    pendingMap[t.receiver_id] = (pendingMap[t.receiver_id] ?? 0) + 1
  }

  // Audit actions this month per user
  const auditMap: Record<string, number> = {}
  for (const row of auditRows ?? []) {
    auditMap[row.user_id] = (auditMap[row.user_id] ?? 0) + 1
  }

  // Only consider users with at least 1 sticker
  const activeUsers = users.filter((u) => (stickerMap[u.id] ?? 0) > 0)
  if (activeUsers.length === 0) return []

  const insights: Insight[] = []

  // ── 1. Biggest collection ─────────────────────────────────────────────────
  const topCollector = activeUsers.reduce((a, b) =>
    (stickerMap[a.id] ?? 0) >= (stickerMap[b.id] ?? 0) ? a : b
  )
  const topCount = stickerMap[topCollector.id] ?? 0
  const topPct = Math.round((topCount / TOTAL) * 100)
  insights.push({
    id: 'top-collector',
    emoji: '📚',
    title: 'Maior Colecionador',
    highlight: `${topCollector.name} tem ${topCount} figurinhas — ${topPct}% do álbum`,
    detail: `Só faltam ${TOTAL - topCount} pra completar. Vai lá trocar logo!`,
    color: 'green',
  })

  // ── 2. Closest to completion ──────────────────────────────────────────────
  const closest = activeUsers.reduce((a, b) =>
    (stickerMap[a.id] ?? 0) >= (stickerMap[b.id] ?? 0) ? a : b
  )
  const missing = TOTAL - (stickerMap[closest.id] ?? 0)
  if (missing > 0 && missing <= 100) {
    insights.push({
      id: 'closest',
      emoji: '🎯',
      title: 'Quase Lá',
      highlight: `${closest.name} está a apenas ${missing} figurinha${missing !== 1 ? 's' : ''} do álbum completo`,
      detail: 'Se não completar até o fim do campeonato, vai ser difícil de explicar.',
      color: 'teal',
    })
  }

  // ── 3. Biggest spender ────────────────────────────────────────────────────
  const spendByUser: Record<string, number> = {}
  for (const u of activeUsers) {
    spendByUser[u.id] = estimatedSpend(stickerMap[u.id] ?? 0, dupeMap[u.id] ?? 0)
  }
  const bigSpender = activeUsers.reduce((a, b) =>
    (spendByUser[a.id] ?? 0) >= (spendByUser[b.id] ?? 0) ? a : b
  )
  const bigSpend = spendByUser[bigSpender.id] ?? 0
  insights.push({
    id: 'big-spender',
    emoji: '💸',
    title: 'Maior Investidor',
    highlight: `${bigSpender.name} gastou ~R$${bigSpend} em figurinhas`,
    detail: `Com esse dinheiro dava pra assinar o streaming da Copa inteira e ainda sobrava troco.`,
    color: 'orange',
  })

  // ── 4. Collective spend ───────────────────────────────────────────────────
  const totalSpend = Object.values(spendByUser).reduce((s, v) => s + v, 0)
  const pizzas = Math.floor(totalSpend / 50)
  const ubers = Math.floor(totalSpend / 25)
  insights.push({
    id: 'collective-spend',
    emoji: '🍕',
    title: 'Investimento Coletivo do YVY',
    highlight: `O condomínio gastou coletivamente ~R$${totalSpend} em figurinhas`,
    detail: pizzas > 0
      ? `Dava pra pedir ${pizzas} pizzas grandes pra todo mundo — uma por ${Math.ceil(users.length / pizzas)} morador. Prioridades, né?`
      : `Dava pra pagar ${ubers} corridas de Uber. Figurinha é caro, hein!`,
    color: 'amber',
  })

  // ── 5. Duplicate king ─────────────────────────────────────────────────────
  const dupeKing = activeUsers
    .filter((u) => (dupeMap[u.id] ?? 0) > 0)
    .reduce(
      (a, b) => ((dupeMap[a?.id] ?? 0) >= (dupeMap[b.id] ?? 0) ? a : b),
      activeUsers[0]
    )
  if (dupeKing && (dupeMap[dupeKing.id] ?? 0) > 0) {
    const dupeCount = dupeMap[dupeKing.id]
    insights.push({
      id: 'dupe-king',
      emoji: '👑',
      title: 'Rei das Repetidas',
      highlight: `${dupeKing.name} acumulou ${dupeCount} cópias extras de figurinhas`,
      detail: `Talvez seja hora de abrir uma banca de figurinhas na portaria do YVY.`,
      color: 'purple',
    })
  }

  // ── 6. Worst cost-benefit (highest dupe ratio) ───────────────────────────
  const ratioByUser: Record<string, number> = {}
  for (const u of activeUsers) {
    const s = stickerMap[u.id] ?? 0
    const d = dupeMap[u.id] ?? 0
    if (s + d >= 20) ratioByUser[u.id] = Math.round((d / (s + d)) * 100)
  }
  const worstRatioUser = Object.entries(ratioByUser).sort(([, a], [, b]) => b - a)[0]
  if (worstRatioUser && worstRatioUser[1] >= 20) {
    const [uid, ratio] = worstRatioUser
    insights.push({
      id: 'worst-ratio',
      emoji: '😅',
      title: 'Pior Custo-Benefício',
      highlight: `${ratio}% das figurinhas que ${nameMap[uid]} comprou são repetidas`,
      detail: `O destino claramente não quer que esse álbum seja completado. Boa sorte.`,
      color: 'red',
    })
  }

  // ── 7. Top trader ─────────────────────────────────────────────────────────
  if (totalTrades > 0) {
    const topTraderEntry = Object.entries(tradeMap)
      .filter(([id]) => nameMap[id])
      .sort(([, a], [, b]) => b - a)[0]
    if (topTraderEntry) {
      const [uid, count] = topTraderEntry
      insights.push({
        id: 'top-trader',
        emoji: '🔄',
        title: 'Figurinheiro Negociante',
        highlight: `${nameMap[uid]} participou de ${count} troca${count !== 1 ? 's' : ''}`,
        detail: `Gosta mais de trocar do que de colar. Vai que é o seu negócio mesmo.`,
        color: 'blue',
      })
    }
  }

  // ── 8. Pending inbox overload ────────────────────────────────────────────
  const pendingEntry = Object.entries(pendingMap)
    .filter(([id]) => nameMap[id])
    .sort(([, a], [, b]) => b - a)[0]
  if (pendingEntry && pendingEntry[1] >= 2) {
    const [uid, count] = pendingEntry
    insights.push({
      id: 'inbox-overload',
      emoji: '⏳',
      title: 'Inbox Lotado',
      highlight: `${nameMap[uid]} tem ${count} pedidos de troca esperando resposta`,
      detail: `Chega de deixar as pessoas no vácuo, pô! Responde logo!`,
      color: 'orange',
    })
  }

  // ── 9. Most active on app ─────────────────────────────────────────────────
  const auditEntry = Object.entries(auditMap)
    .filter(([id]) => nameMap[id])
    .sort(([, a], [, b]) => b - a)[0]
  if (auditEntry && auditEntry[1] >= 5) {
    const [uid, count] = auditEntry
    const hoursPerAction = Math.round((30 * 24) / count)
    insights.push({
      id: 'most-active',
      emoji: '📱',
      title: 'Viciado no App',
      highlight: `${nameMap[uid]} registrou ${count} ações no app esse mês`,
      detail: hoursPerAction <= 2
        ? `Uma ação a cada ${hoursPerAction}h. Esse app virou o segundo emprego.`
        : `Isso dá uma ação a cada ${hoursPerAction} horas. Tem vida fora das figurinhas?`,
      color: 'pink',
    })
  }

  // ── 10. Collective stats footer ───────────────────────────────────────────
  const totalStickers = Object.values(stickerMap).reduce((s, v) => s + v, 0)
  const avgCompletion = Math.round(
    activeUsers.reduce((s, u) => s + (stickerMap[u.id] ?? 0), 0) / activeUsers.length
  )
  insights.push({
    id: 'collective-stats',
    emoji: '🌍',
    title: 'O YVY em Números',
    highlight: `${activeUsers.length} colecionadores, ${totalStickers} figurinhas coladas, ${totalTrades} trocas realizadas`,
    detail: `Média de ${avgCompletion} figurinhas por álbum (${Math.round((avgCompletion / TOTAL) * 100)}% de conclusão). O campeonato agradece o investimento.`,
    color: 'teal',
  })

  return insights
}

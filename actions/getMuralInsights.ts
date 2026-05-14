'use server'

import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS } from '@/lib/stickers'
import { formatName } from '@/lib/format'

const TOTAL = ALL_STICKER_IDS.length
const PACK_SIZE = 7
const PACK_PRICE = 7 // R$7 per pack
const CHOPP_PRICE = 16 // R$ per liter (draft beer)
const COSTELA_KG_PRICE = 35 // R$ per kg (costela gaúcha)
const DIAPER_PRICE = 1 // R$ per disposable diaper

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

async function computeMuralInsights(): Promise<Insight[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: users },
    { data: stickerCounts },
    { data: dupeRows },
    { data: acceptedTrades },
    { data: pendingTrades },
    { data: auditRows },
    { data: lookupRows },
  ] = await Promise.all([
    supabaseAdmin.from('users').select('id, name').eq('approved', true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any).rpc('get_sticker_counts_by_user'),
    supabaseAdmin.from('user_duplicates').select('user_id, count').limit(2000),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id, giving_ids, receiving_ids')
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id')
      .eq('status', 'pending'),
    supabaseAdmin.from('audit_log').select('user_id').gte('created_at', thirtyDaysAgo).limit(2000),
    supabaseAdmin
      .from('audit_log')
      .select('user_id')
      .in('action', ['sticker_lookup', 'external_list_check'])
      .gte('created_at', thirtyDaysAgo)
      .limit(2000),
  ])

  if (!users || users.length === 0) return []

  const nameMap = Object.fromEntries(users.map((u) => [u.id, formatName(u.name as string)]))

  // Sticker count per user
  const stickerMap: Record<string, number> = {}
  for (const row of stickerCounts ?? []) stickerMap[row.user_id] = Number(row.sticker_count)

  // Total dupe copies per user
  const dupeMap: Record<string, number> = {}
  for (const row of dupeRows ?? []) {
    dupeMap[row.user_id] = (dupeMap[row.user_id] ?? 0) + row.count
  }

  // Trade count and stickers received per user (accepted)
  const tradeMap: Record<string, number> = {}
  const stickersReceivedMap: Record<string, number> = {}
  for (const t of acceptedTrades ?? []) {
    tradeMap[t.initiator_id] = (tradeMap[t.initiator_id] ?? 0) + 1
    tradeMap[t.receiver_id] = (tradeMap[t.receiver_id] ?? 0) + 1
    // initiator receives receiving_ids; receiver receives giving_ids
    stickersReceivedMap[t.initiator_id] =
      (stickersReceivedMap[t.initiator_id] ?? 0) + (t.receiving_ids?.length ?? 0)
    stickersReceivedMap[t.receiver_id] =
      (stickersReceivedMap[t.receiver_id] ?? 0) + (t.giving_ids?.length ?? 0)
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
    highlight: `${formatName(topCollector.name as string)} tem ${topCount} figurinhas — ${topPct}% do álbum`,
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
      highlight: `${formatName(closest.name as string)} está a apenas ${missing} figurinha${missing !== 1 ? 's' : ''} do álbum completo`,
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
  const personalChopps = Math.floor(bigSpend / CHOPP_PRICE)
  insights.push({
    id: 'big-spender',
    emoji: '💸',
    title: 'Maior Investidor',
    highlight: `${formatName(bigSpender.name as string)} gastou ~R$${bigSpend} em figurinhas`,
    detail: personalChopps >= 3
      ? `Com esse dinheiro dava pra tomar ${personalChopps} litros de chopp na beira da piscina (em copo plástico, claro — vidro não é permitido).`
      : `Com esse dinheiro dava pra assinar o streaming da Copa inteira e ainda sobrava troco.`,
    color: 'orange',
  })

  // ── 4. Collective spend ───────────────────────────────────────────────────
  const totalSpend = Object.values(spendByUser).reduce((s, v) => s + v, 0)
  const pizzas = Math.floor(totalSpend / 50)
  const chopps = Math.floor(totalSpend / CHOPP_PRICE)
  const kgCostela = Math.floor(totalSpend / COSTELA_KG_PRICE)
  insights.push({
    id: 'collective-spend',
    emoji: '🍕',
    title: 'Investimento Coletivo do YVY',
    highlight: `O condomínio gastou coletivamente ~R$${totalSpend} em figurinhas`,
    detail: `Isso dava pra: ${pizzas > 0 ? `${pizzas} pizzas grandes 🍕 · ` : ''}${chopps} litros de chopp 🍺 · ${kgCostela} kg de costela gaúcha 🥩. As prioridades do YVY!`,
    color: 'amber',
  })

  // ── 4b. Fraldas (absurd humor) ────────────────────────────────────────────
  const diapers = Math.floor(totalSpend / DIAPER_PRICE)
  const babyMonths = Math.round(diapers / 180) // ~6 fraldas/dia × 30 dias
  if (diapers >= 100) {
    insights.push({
      id: 'fraldas',
      emoji: '👶',
      title: 'Figurinha ou Fralda?',
      highlight: `Os ~R$${totalSpend} gastos no álbum equivalem a ${diapers} fraldas descartáveis`,
      detail: `Um bebê usaria por cerca de ${babyMonths} meses. Mas não — escolhemos Mbappé e Vini Jr. de papel. Decisão acertada.`,
      color: 'pink',
    })
  }

  // ── 5. Duplicate king ─────────────────────────────────────────────────────
  const dupeKing = activeUsers
    .filter((u) => (dupeMap[u.id] ?? 0) > 0)
    .reduce((a, b) => ((dupeMap[a?.id] ?? 0) >= (dupeMap[b.id] ?? 0) ? a : b), activeUsers[0])
  if (dupeKing && (dupeMap[dupeKing.id] ?? 0) > 0) {
    const dupeCount = dupeMap[dupeKing.id]
    insights.push({
      id: 'dupe-king',
      emoji: '👑',
      title: 'Rei das Repetidas',
      highlight: `${formatName(dupeKing.name as string)} acumulou ${dupeCount} cópias extras de figurinhas`,
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

  // ── 6b. Real cost per sticker ─────────────────────────────────────────────
  const effectiveCostByUser: Record<string, number> = {}
  for (const u of activeUsers) {
    const s = stickerMap[u.id] ?? 0
    const spent = spendByUser[u.id] ?? 0
    if (s >= 20 && spent > 0) effectiveCostByUser[u.id] = spent / s
  }
  const expensiveEntry = Object.entries(effectiveCostByUser).sort(([, a], [, b]) => b - a)[0]
  if (expensiveEntry && expensiveEntry[1] >= 1.5) {
    const [uid, cost] = expensiveEntry
    const markup = Math.round((cost - 1) * 100)
    insights.push({
      id: 'custo-real',
      emoji: '📊',
      title: 'Imposto das Repetidas',
      highlight: `${nameMap[uid]} pagou em média R$${cost.toFixed(2).replace('.', ',')} por figurinha única — a Panini cobra R$1,00`,
      detail: `As repetidas inflaram o custo em ${markup}%. Troca antes de abrir mais pacotes!`,
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
      const received = stickersReceivedMap[uid] ?? 0
      const saved = Math.round(received * (PACK_PRICE / PACK_SIZE))
      insights.push({
        id: 'top-trader',
        emoji: '🔄',
        title: 'Figurinheiro Negociante',
        highlight: `${nameMap[uid]} participou de ${count} troca${count !== 1 ? 's' : ''} e recebeu ${received} figurinha${received !== 1 ? 's' : ''} pelo app`,
        detail:
          saved > 0
            ? `Isso equivale a ~R$${saved} em pacotes que não precisou comprar. Networking que se paga!`
            : `Gosta mais de trocar do que de colar. Vai que é o seu negócio mesmo.`,
        color: 'blue',
      })
    }

    // ── 7b. Biggest saver ───────────────────────────────────────────────────
    const topSaverEntry = Object.entries(stickersReceivedMap)
      .filter(([id]) => nameMap[id])
      .sort(([, a], [, b]) => b - a)[0]
    if (topSaverEntry) {
      const [uid, received] = topSaverEntry
      const saved = Math.round(received * (PACK_PRICE / PACK_SIZE))
      if (saved >= 7) {
        insights.push({
          id: 'top-saver',
          emoji: '🤑',
          title: 'Economizador do YVY',
          highlight: `${nameMap[uid]} economizou ~R$${saved} trocando figurinhas pelo app`,
          detail: `${received} figurinhas recebidas em trocas = ${received} pacotes que não precisou comprar. Enquanto outros desembolsavam na banca, esse aqui foi no papo.`,
          color: 'green',
        })
      }
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
      detail:
        hoursPerAction <= 2
          ? `Uma ação a cada ${hoursPerAction}h. Esse app virou o segundo emprego.`
          : `Isso dá uma ação a cada ${hoursPerAction} horas. Tem vida fora das figurinhas?`,
      color: 'pink',
    })
  }

  // ── 10. Outsider / sticker-lookup traitor ────────────────────────────────
  const lookupMap: Record<string, number> = {}
  for (const row of lookupRows ?? []) {
    lookupMap[row.user_id] = (lookupMap[row.user_id] ?? 0) + 1
  }
  const topLookupEntry = Object.entries(lookupMap)
    .filter(([id]) => nameMap[id])
    .sort(([, a], [, b]) => b - a)[0]
  if (topLookupEntry && topLookupEntry[1] >= 3) {
    const [uid, count] = topLookupEntry
    insights.push({
      id: 'outsider',
      emoji: '🕵️',
      title: 'Traidor do Condomínio',
      highlight: `${nameMap[uid]} verificou figurinhas fora do app ${count} vez${count !== 1 ? 'es' : ''} esse mês`,
      detail: `Enquanto o YVY tem trocas de sobra, alguém anda fazendo negócio nas costas com estranhos. O grupo do WhatsApp não tá bom não, hein?`,
      color: 'red',
    })
  }

  // ── 11. Collective stats footer ───────────────────────────────────────────
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

const cachedMuralInsights = unstable_cache(
  computeMuralInsights,
  ['mural-insights'],
  { revalidate: 300 } // 5-minute TTL shared across all users
)

export async function getMuralInsights(): Promise<Insight[]> {
  return cachedMuralInsights()
}

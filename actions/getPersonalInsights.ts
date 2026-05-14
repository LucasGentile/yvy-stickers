'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS, ALL_STICKER_SECTIONS } from '@/lib/stickers'
import { formatName } from '@/lib/format'

const TOTAL = ALL_STICKER_IDS.length
const PACK_SIZE = 7
const PACK_PRICE = 7 // R$7 per pack

export type PersonalInsights = {
  // Profile
  name: string
  tower: string
  apartment: string
  accountAgeDays: number

  // Album
  ownedCount: number
  totalStickers: number
  completionPct: number
  missingCount: number

  // Acquisition
  purchasedCount: number   // owned - received from trades
  fromTradeCount: number   // stickers received via accepted trades
  estimatedPacksBought: number
  estimatedSpentBrl: number
  estimatedSavedBrl: number // cost equivalent of stickers received from trades

  // Trading
  completedTrades: number
  stickersGiven: number
  stickersReceived: number
  bestTradeFriend: string | null
  bestTradeFriendTrades: number

  // Duplicates
  totalDuplicateCopies: number
  mostDuplicatedSticker: string | null
  mostDuplicatedStickerCount: number
  leastDuplicatedSticker: string | null
  leastDuplicatedStickerCount: number
  mostDuplicatedCountry: string | null   // team code e.g. "BRA"
  mostDuplicatedCountryName: string | null
  mostDuplicatedCountryCount: number
  leastDuplicatedCountry: string | null
  leastDuplicatedCountryName: string | null
  leastDuplicatedCountryCount: number

  // Collection highlights
  mostCompleteTeam: string | null        // team name
  mostCompleteTeamPct: number
  leastCompleteTeam: string | null
  leastCompleteTeamPct: number
}

export async function getPersonalInsights(userId: string): Promise<PersonalInsights | null> {
  const [
    { data: user },
    { data: stickers },
    { data: duplicates },
    { data: trades },
  ] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('name, tower, apartment, created_at')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('user_stickers')
      .select('sticker_id')
      .eq('user_id', userId),
    supabaseAdmin
      .from('user_duplicates')
      .select('sticker_id, count')
      .eq('user_id', userId),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id, giving_ids, receiving_ids')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted'),
  ])

  if (!user) return null

  // ── Account age ──────────────────────────────────────────────────────────
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.created_at as string).getTime()) / (1000 * 60 * 60 * 24)
  )

  // ── Album stats ──────────────────────────────────────────────────────────
  const ownedIds = new Set((stickers ?? []).map((r) => r.sticker_id as string))
  const ownedCount = ownedIds.size
  const missingCount = TOTAL - ownedCount
  const completionPct = Math.round((ownedCount / TOTAL) * 100)

  // ── Trade breakdown ──────────────────────────────────────────────────────
  const receivedFromTrade = new Set<string>()
  let stickersGiven = 0
  const partnerCounts: Record<string, number> = {}

  for (const trade of trades ?? []) {
    const isInitiator = trade.initiator_id === userId
    const received: string[] = isInitiator ? (trade.receiving_ids ?? []) : (trade.giving_ids ?? [])
    const given: string[] = isInitiator ? (trade.giving_ids ?? []) : (trade.receiving_ids ?? [])
    const partner = isInitiator ? trade.receiver_id : trade.initiator_id

    for (const id of received) receivedFromTrade.add(id)
    stickersGiven += given.length
    if (partner) partnerCounts[partner] = (partnerCounts[partner] ?? 0) + 1
  }

  const completedTrades = (trades ?? []).length
  const fromTradeCount = receivedFromTrade.size
  const stickersReceived = receivedFromTrade.size

  // Purchased = owned stickers not received via trade (best estimate — some may overlap)
  const purchasedCount = Math.max(0, ownedCount - fromTradeCount)

  const totalDupesCopies = (duplicates ?? []).reduce((s, r) => s + r.count, 0)
  const estimatedPacksBought = Math.ceil((purchasedCount + totalDupesCopies) / PACK_SIZE)
  const estimatedSpentBrl = estimatedPacksBought * PACK_PRICE
  const estimatedSavedBrl = Math.round(fromTradeCount * (PACK_PRICE / PACK_SIZE))

  // ── Best trade friend ────────────────────────────────────────────────────
  let bestTradeFriend: string | null = null
  let bestTradeFriendTrades = 0
  const topPartnerEntry = Object.entries(partnerCounts).sort(([, a], [, b]) => b - a)[0]
  if (topPartnerEntry) {
    bestTradeFriendTrades = topPartnerEntry[1]
    const { data: partnerUser } = await supabaseAdmin
      .from('users')
      .select('name')
      .eq('id', topPartnerEntry[0])
      .maybeSingle()
    bestTradeFriend = partnerUser ? formatName(partnerUser.name as string) : null
  }

  // ── Duplicate stats ──────────────────────────────────────────────────────
  let mostDuplicatedSticker: string | null = null
  let mostDuplicatedStickerCount = 0
  let leastDuplicatedSticker: string | null = null
  let leastDuplicatedStickerCount = Infinity

  const countryDupeTotals: Record<string, number> = {}
  for (const row of duplicates ?? []) {
    const id = row.sticker_id as string
    const count = row.count as number
    if (count > mostDuplicatedStickerCount) {
      mostDuplicatedStickerCount = count
      mostDuplicatedSticker = id
    }
    if (count < leastDuplicatedStickerCount) {
      leastDuplicatedStickerCount = count
      leastDuplicatedSticker = id
    }
    // Extract team code (letters before the number)
    const match = id.match(/^([A-Z]+)/)
    if (match) {
      countryDupeTotals[match[1]] = (countryDupeTotals[match[1]] ?? 0) + count
    }
  }
  if (leastDuplicatedStickerCount === Infinity) leastDuplicatedStickerCount = 0

  function lookupTeamName(code: string): string | null {
    for (const section of ALL_STICKER_SECTIONS) {
      if (section.type === 'group') {
        const team = section.teams.find((t) => t.code === code)
        if (team) return team.name
      }
    }
    return null
  }

  // Find team name for most-duped country
  let mostDuplicatedCountry: string | null = null
  let mostDuplicatedCountryName: string | null = null
  let mostDuplicatedCountryCount = 0
  const topCountryEntry = Object.entries(countryDupeTotals).sort(([, a], [, b]) => b - a)[0]
  if (topCountryEntry) {
    mostDuplicatedCountry = topCountryEntry[0]
    mostDuplicatedCountryCount = topCountryEntry[1]
    mostDuplicatedCountryName = lookupTeamName(mostDuplicatedCountry)
  }

  // Find team name for least-duped country
  let leastDuplicatedCountry: string | null = null
  let leastDuplicatedCountryName: string | null = null
  let leastDuplicatedCountryCount = 0
  const bottomCountryEntry = Object.entries(countryDupeTotals).sort(([, a], [, b]) => a - b)[0]
  if (bottomCountryEntry) {
    leastDuplicatedCountry = bottomCountryEntry[0]
    leastDuplicatedCountryCount = bottomCountryEntry[1]
    leastDuplicatedCountryName = lookupTeamName(leastDuplicatedCountry)
  }

  // ── Team completion highlights ───────────────────────────────────────────
  let mostCompleteTeam: string | null = null
  let mostCompleteTeamPct = 0
  let leastCompleteTeam: string | null = null
  let leastCompleteTeamPct = 100

  for (const section of ALL_STICKER_SECTIONS) {
    if (section.type !== 'group') continue
    for (const team of section.teams) {
      const ownedInTeam = team.stickers.filter((id) => ownedIds.has(id)).length
      const pct = Math.round((ownedInTeam / team.stickers.length) * 100)
      if (pct > mostCompleteTeamPct) {
        mostCompleteTeamPct = pct
        mostCompleteTeam = team.name
      }
      if (pct < leastCompleteTeamPct) {
        leastCompleteTeamPct = pct
        leastCompleteTeam = team.name
      }
    }
  }

  return {
    name: formatName(user.name as string),
    tower: user.tower as string,
    apartment: user.apartment as string,
    accountAgeDays,

    ownedCount,
    totalStickers: TOTAL,
    completionPct,
    missingCount,

    purchasedCount,
    fromTradeCount,
    estimatedPacksBought,
    estimatedSpentBrl,
    estimatedSavedBrl,

    completedTrades,
    stickersGiven,
    stickersReceived,
    bestTradeFriend,
    bestTradeFriendTrades,

    totalDuplicateCopies: totalDupesCopies,
    mostDuplicatedSticker,
    mostDuplicatedStickerCount,
    leastDuplicatedSticker,
    leastDuplicatedStickerCount,
    mostDuplicatedCountry,
    mostDuplicatedCountryName,
    mostDuplicatedCountryCount,
    leastDuplicatedCountry,
    leastDuplicatedCountryName,
    leastDuplicatedCountryCount,

    mostCompleteTeam,
    mostCompleteTeamPct,
    leastCompleteTeam,
    leastCompleteTeamPct,
  }
}

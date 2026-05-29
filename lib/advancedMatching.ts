'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isChromeSticker, computeNeeded } from '@/lib/stickers'

export type AdvancedTradeProposal = {
  userAId: string
  userBId: string
  userCId: string
  aGivesIds: string[]
  bGivesIds: string[]
  cGivesIds: string[]
}

type UserTradeData = {
  id: string
  inputMode: string
  stickers: Set<string>
  duplicates: Map<string, number>
}

function getReservedCounts(
  userId: string,
  pendingNormalTrades: Array<{
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }>,
  pendingAdvancedTrades: Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }>
): Map<string, number> {
  const reserved = new Map<string, number>()

  for (const trade of pendingNormalTrades) {
    const giving =
      trade.initiator_id === userId
        ? trade.giving_ids
        : trade.receiver_id === userId
          ? trade.receiving_ids
          : null
    if (!giving) continue
    for (const id of giving) {
      reserved.set(id, (reserved.get(id) ?? 0) + 1)
    }
  }

  for (const trade of pendingAdvancedTrades) {
    let giving: string[] | null = null
    if (trade.user_a_id === userId) giving = trade.a_gives_ids
    else if (trade.user_b_id === userId) giving = trade.b_gives_ids
    else if (trade.user_c_id === userId) giving = trade.c_gives_ids
    if (!giving) continue
    for (const id of giving) {
      reserved.set(id, (reserved.get(id) ?? 0) + 1)
    }
  }

  return reserved
}

function getIncomingStickers(
  userId: string,
  pendingNormalTrades: Array<{
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }>,
  pendingAdvancedTrades: Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }>
): Set<string> {
  const incoming = new Set<string>()

  for (const trade of pendingNormalTrades) {
    if (trade.initiator_id === userId) {
      for (const id of trade.receiving_ids ?? []) incoming.add(id)
    } else if (trade.receiver_id === userId) {
      for (const id of trade.giving_ids ?? []) incoming.add(id)
    }
  }

  for (const trade of pendingAdvancedTrades) {
    if (trade.user_a_id === userId) {
      for (const id of trade.c_gives_ids ?? []) incoming.add(id)
    } else if (trade.user_b_id === userId) {
      for (const id of trade.a_gives_ids ?? []) incoming.add(id)
    } else if (trade.user_c_id === userId) {
      for (const id of trade.b_gives_ids ?? []) incoming.add(id)
    }
  }

  return incoming
}

function getAvailableDuplicates(user: UserTradeData, reserved: Map<string, number>): Set<string> {
  const available = new Set<string>()
  for (const [stickerId, count] of user.duplicates) {
    if (count > (reserved.get(stickerId) ?? 0)) {
      available.add(stickerId)
    }
  }
  return available
}

function selectStickers(candidates: string[], count: number): string[] {
  const nonChrome = candidates.filter((id) => !isChromeSticker(id)).sort()
  const chrome = candidates.filter((id) => isChromeSticker(id)).sort()
  return [...nonChrome, ...chrome].slice(0, count)
}

async function loadAllTradeData(): Promise<{
  users: UserTradeData[]
  pendingNormalTrades: Array<{
    initiator_id: string
    receiver_id: string
    giving_ids: string[]
    receiving_ids: string[]
  }>
  pendingAdvancedTrades: Array<{
    user_a_id: string
    user_b_id: string
    user_c_id: string
    a_gives_ids: string[]
    b_gives_ids: string[]
    c_gives_ids: string[]
  }>
}> {
  const [{ data: dbUsers }, { data: normalTrades }, { data: advancedTrades }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('id, input_mode, user_stickers(sticker_id), user_duplicates(sticker_id, count)')
      .eq('approved', true)
      .eq('trades_blocked', false),
    supabaseAdmin
      .from('pending_trades')
      .select('initiator_id, receiver_id, giving_ids, receiving_ids')
      .eq('status', 'pending'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('advanced_trades')
      .select('user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids')
      .eq('status', 'pending'),
  ])

  type DbUser = {
    id: string
    input_mode: string
    user_stickers: { sticker_id: string }[]
    user_duplicates: { sticker_id: string; count: number }[]
  }

  const users: UserTradeData[] = ((dbUsers ?? []) as DbUser[]).map((u) => ({
    id: u.id,
    inputMode: u.input_mode,
    stickers: new Set(u.user_stickers.map((s) => s.sticker_id)),
    duplicates: new Map(u.user_duplicates.map((d) => [d.sticker_id, d.count])),
  }))

  return {
    users,
    pendingNormalTrades: (normalTrades ?? []) as Array<{
      initiator_id: string
      receiver_id: string
      giving_ids: string[]
      receiving_ids: string[]
    }>,
    pendingAdvancedTrades: (advancedTrades ?? []) as Array<{
      user_a_id: string
      user_b_id: string
      user_c_id: string
      a_gives_ids: string[]
      b_gives_ids: string[]
      c_gives_ids: string[]
    }>,
  }
}

export async function checkAdvancedTradeEligibility(userId: string): Promise<boolean> {
  if (!userId) return false

  const { users, pendingNormalTrades, pendingAdvancedTrades } = await loadAllTradeData()

  const me = users.find((u) => u.id === userId)
  if (!me) return false

  const myReserved = getReservedCounts(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myIncoming = getIncomingStickers(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myAvailableDupes = getAvailableDuplicates(me, myReserved)
  const myNeeded = new Set(
    [...computeNeeded(me.inputMode, me.stickers)].filter((id) => !myIncoming.has(id))
  )

  if (myAvailableDupes.size === 0 || myNeeded.size === 0) return false

  const others = users.filter((u) => u.id !== userId)

  // potentialReceivers: users who need at least one of my available dupes
  const potentialReceivers: Array<{ user: UserTradeData; available: Set<string> }> = []
  for (const other of others) {
    const otherIncoming = getIncomingStickers(other.id, pendingNormalTrades, pendingAdvancedTrades)
    const otherNeeded = new Set(
      [...computeNeeded(other.inputMode, other.stickers)].filter((id) => !otherIncoming.has(id))
    )
    const iCanGive = [...myAvailableDupes].some((id) => otherNeeded.has(id))
    if (iCanGive) {
      const otherReserved = getReservedCounts(other.id, pendingNormalTrades, pendingAdvancedTrades)
      const otherAvailable = getAvailableDuplicates(other, otherReserved)
      potentialReceivers.push({ user: other, available: otherAvailable })
    }
  }

  // potentialGivers: users who have available dupes I need
  const potentialGivers: Array<{ user: UserTradeData; available: Set<string> }> = []
  for (const other of others) {
    const otherReserved = getReservedCounts(other.id, pendingNormalTrades, pendingAdvancedTrades)
    const otherAvailable = getAvailableDuplicates(other, otherReserved)
    const canGiveToMe = [...otherAvailable].some((id) => myNeeded.has(id))
    if (canGiveToMe) {
      potentialGivers.push({ user: other, available: otherAvailable })
    }
  }

  // Check if closing the cycle is possible:
  // I give to receiver B, giver C gives to me. Does B have dupes that C needs?
  for (const receiver of potentialReceivers) {
    for (const giver of potentialGivers) {
      if (giver.user.id === receiver.user.id) continue
      const giverIncoming = getIncomingStickers(
        giver.user.id,
        pendingNormalTrades,
        pendingAdvancedTrades
      )
      const giverNeeded = new Set(
        [...computeNeeded(giver.user.inputMode, giver.user.stickers)].filter(
          (id) => !giverIncoming.has(id)
        )
      )
      const canClose = [...receiver.available].some((id) => giverNeeded.has(id))
      if (canClose) return true
    }
  }

  return false
}

export type ScoredProposal = AdvancedTradeProposal & { score: number }

const MAX_ADVANCED_RESULTS = 5

export async function findAllAdvancedTrades(
  userId: string,
  partnerIds?: string[]
): Promise<ScoredProposal[]> {
  if (!userId) return []

  const { users, pendingNormalTrades, pendingAdvancedTrades } = await loadAllTradeData()

  const me = users.find((u) => u.id === userId)
  if (!me) return []

  const myReserved = getReservedCounts(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myIncoming = getIncomingStickers(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myAvailableDupes = getAvailableDuplicates(me, myReserved)
  const myNeeded = new Set(
    [...computeNeeded(me.inputMode, me.stickers)].filter((id) => !myIncoming.has(id))
  )

  if (myAvailableDupes.size === 0 || myNeeded.size === 0) return []

  const partnerSet = partnerIds ? new Set(partnerIds) : null
  const others = users.filter((u) => u.id !== userId && (!partnerSet || partnerSet.has(u.id)))

  const proposals: ScoredProposal[] = []
  const seen = new Set<string>()

  // Pre-compute per-user data once — avoids recomputing inside the O(n²) pair loop
  type UserCache = { available: Set<string>; needed: Set<string> }
  const othersData = new Map<string, UserCache>()
  for (const user of others) {
    const reserved = getReservedCounts(user.id, pendingNormalTrades, pendingAdvancedTrades)
    const incoming = getIncomingStickers(user.id, pendingNormalTrades, pendingAdvancedTrades)
    othersData.set(user.id, {
      available: getAvailableDuplicates(user, reserved),
      needed: new Set(
        [...computeNeeded(user.inputMode, user.stickers)].filter((id) => !incoming.has(id))
      ),
    })
  }

  // Try all pairs (B, C) where A→B, B→C, C→A
  for (const userB of others) {
    const { available: bAvailableDupes, needed: bNeeded } = othersData.get(userB.id)!

    // A→B: my dupes that B needs
    const aToB = [...myAvailableDupes].filter((id) => bNeeded.has(id))
    if (aToB.length === 0) continue

    for (const userC of others) {
      if (userC.id === userB.id) continue

      // Deduplicate: (A,B,C) and (A,C,B) are different cycles, but check canonical key
      const key = [userB.id, userC.id].sort().join(':')
      if (seen.has(key)) continue

      const { available: cAvailableDupes, needed: cNeeded } = othersData.get(userC.id)!

      // B→C: B's dupes that C needs
      const bToC = [...bAvailableDupes].filter((id) => cNeeded.has(id))
      if (bToC.length === 0) continue

      // C→A: C's dupes that A needs
      const cToA = [...cAvailableDupes].filter((id) => myNeeded.has(id))
      if (cToA.length === 0) continue

      // Score = bottleneck (balanced trade)
      const score = Math.min(aToB.length, bToC.length, cToA.length)
      seen.add(key)
      proposals.push({
        userAId: userId,
        userBId: userB.id,
        userCId: userC.id,
        aGivesIds: selectStickers(aToB, score),
        bGivesIds: selectStickers(bToC, score),
        cGivesIds: selectStickers(cToA, score),
        score,
      })
    }
  }

  proposals.sort((a, b) => b.score - a.score)

  return proposals.slice(0, MAX_ADVANCED_RESULTS)
}

export async function findBestAdvancedTrade(userId: string): Promise<AdvancedTradeProposal | null> {
  const all = await findAllAdvancedTrades(userId)
  return all.length > 0 ? all[0] : null
}

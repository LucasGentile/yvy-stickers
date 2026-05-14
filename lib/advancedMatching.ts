'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ALL_STICKER_IDS, isChromeSticker } from '@/lib/stickers'

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

function computeNeeded(mode: string, marked: Set<string>): Set<string> {
  return mode === 'have' ? new Set(ALL_STICKER_IDS.filter((id) => !marked.has(id))) : marked
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
      trade.initiator_id === userId ? trade.giving_ids : trade.receiver_id === userId ? trade.receiving_ids : null
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

function getAvailableDuplicates(
  user: UserTradeData,
  reserved: Map<string, number>
): Set<string> {
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
      .select(
        'id, input_mode, user_stickers(sticker_id), user_duplicates(sticker_id, count)'
      )
      .eq('approved', true),
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

  console.log('[checkEligibility] Checking for userId:', userId)
  const { users, pendingNormalTrades, pendingAdvancedTrades } = await loadAllTradeData()

  const me = users.find((u) => u.id === userId)
  if (!me) {
    console.log('[checkEligibility] User not found in approved users')
    return false
  }

  const myReserved = getReservedCounts(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myAvailableDupes = getAvailableDuplicates(me, myReserved)
  const myNeeded = computeNeeded(me.inputMode, me.stickers)

  console.log('[checkEligibility] State:', {
    availableDupes: myAvailableDupes.size,
    needed: myNeeded.size,
  })

  if (myAvailableDupes.size === 0 || myNeeded.size === 0) {
    console.log('[checkEligibility] Not eligible: no dupes or no needs')
    return false
  }

  const others = users.filter((u) => u.id !== userId)

  // potentialReceivers: users who need at least one of my available dupes
  const potentialReceivers: Array<{ user: UserTradeData; available: Set<string> }> = []
  for (const other of others) {
    const otherNeeded = computeNeeded(other.inputMode, other.stickers)
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
    const receiverReserved = getReservedCounts(receiver.user.id, pendingNormalTrades, pendingAdvancedTrades)
    const receiverAvailable = getAvailableDuplicates(receiver.user, receiverReserved)

    for (const giver of potentialGivers) {
      if (giver.user.id === receiver.user.id) continue
      const giverNeeded = computeNeeded(giver.user.inputMode, giver.user.stickers)
      const canClose = [...receiverAvailable].some((id) => giverNeeded.has(id))
      if (canClose) return true
    }
  }

  return false
}

export async function findBestAdvancedTrade(
  userId: string
): Promise<AdvancedTradeProposal | null> {
  if (!userId) return null

  console.log('[findBestAdvancedTrade] Loading trade data...')
  const { users, pendingNormalTrades, pendingAdvancedTrades } = await loadAllTradeData()
  console.log('[findBestAdvancedTrade] Loaded:', {
    usersCount: users.length,
    pendingNormal: pendingNormalTrades.length,
    pendingAdvanced: pendingAdvancedTrades.length,
  })

  const me = users.find((u) => u.id === userId)
  if (!me) {
    console.log('[findBestAdvancedTrade] User not found in approved users')
    return null
  }

  const myReserved = getReservedCounts(userId, pendingNormalTrades, pendingAdvancedTrades)
  const myAvailableDupes = getAvailableDuplicates(me, myReserved)
  const myNeeded = computeNeeded(me.inputMode, me.stickers)

  console.log('[findBestAdvancedTrade] My state:', {
    inputMode: me.inputMode,
    stickersCount: me.stickers.size,
    duplicatesCount: me.duplicates.size,
    reservedCount: myReserved.size,
    availableDupesCount: myAvailableDupes.size,
    neededCount: myNeeded.size,
  })

  if (myAvailableDupes.size === 0 || myNeeded.size === 0) {
    console.log('[findBestAdvancedTrade] No available dupes or no needed stickers, aborting')
    return null
  }

  const others = users.filter((u) => u.id !== userId)
  console.log('[findBestAdvancedTrade] Checking', others.length, 'other users for cycles...')

  let bestScore = 0
  let bestProposal: AdvancedTradeProposal | null = null

  // Try all pairs (B, C) where A→B, B→C, C→A
  for (const userB of others) {
    const bReserved = getReservedCounts(userB.id, pendingNormalTrades, pendingAdvancedTrades)
    const bAvailableDupes = getAvailableDuplicates(userB, bReserved)
    const bNeeded = computeNeeded(userB.inputMode, userB.stickers)

    // A→B: my dupes that B needs
    const aToB = [...myAvailableDupes].filter((id) => bNeeded.has(id))
    if (aToB.length === 0) continue

    for (const userC of others) {
      if (userC.id === userB.id) continue

      const cReserved = getReservedCounts(userC.id, pendingNormalTrades, pendingAdvancedTrades)
      const cAvailableDupes = getAvailableDuplicates(userC, cReserved)
      const cNeeded = computeNeeded(userC.inputMode, userC.stickers)

      // B→C: B's dupes that C needs
      const bToC = [...bAvailableDupes].filter((id) => cNeeded.has(id))
      if (bToC.length === 0) continue

      // C→A: C's dupes that A needs
      const cToA = [...cAvailableDupes].filter((id) => myNeeded.has(id))
      if (cToA.length === 0) continue

      // Score = bottleneck (balanced trade)
      const score = Math.min(aToB.length, bToC.length, cToA.length)
      if (score > bestScore) {
        console.log('[findBestAdvancedTrade] Found cycle:', {
          B: userB.id,
          C: userC.id,
          score,
          legs: { aToB: aToB.length, bToC: bToC.length, cToA: cToA.length },
        })
        bestScore = score
        bestProposal = {
          userAId: userId,
          userBId: userB.id,
          userCId: userC.id,
          aGivesIds: selectStickers(aToB, score),
          bGivesIds: selectStickers(bToC, score),
          cGivesIds: selectStickers(cToA, score),
        }
      }
    }
  }

  if (bestProposal) {
    console.log('[findBestAdvancedTrade] Best proposal score:', bestScore)
  } else {
    console.log('[findBestAdvancedTrade] No valid cycle found after checking all pairs')
  }

  return bestProposal
}

'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type AdvancedTradeView = {
  id: string
  status: string
  myGivingIds: string[]
  myReceivingIds: string[]
  giveTo: { id: string; name: string }
  receiveFrom: { id: string; name: string }
  thirdParty: {
    id: string
    name: string
    givesIds: string[]
    givesToName: string
    receivesIds: string[]
  }
  myApprovalStatus: string
  otherStatuses: Array<{ name: string; status: string }>
  createdAt: string
  acceptedAt: string | null
  isRequester: boolean
  verified: boolean
}

export async function getAdvancedTrades(userId: string): Promise<AdvancedTradeView[]> {
  if (!userId) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: trades } = await (supabaseAdmin as any)
    .from('advanced_trades')
    .select(
      'id, status, user_a_id, user_b_id, user_c_id, a_gives_ids, b_gives_ids, c_gives_ids, user_a_status, user_b_status, user_c_status, created_at, accepted_at, requested_by, verified_at'
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId},user_c_id.eq.${userId}`)
    .in('status', ['pending', 'accepted'])
    .order('created_at', { ascending: false })

  if (!trades || trades.length === 0) return []

  const allUserIds = new Set<string>()
  for (const t of trades) {
    allUserIds.add(t.user_a_id)
    allUserIds.add(t.user_b_id)
    allUserIds.add(t.user_c_id)
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name')
    .in('id', [...allUserIds])

  const nameMap = Object.fromEntries((users ?? []).map((u) => [u.id, formatName(u.name)]))

  return trades.map((t: Record<string, unknown>) => {
    const trade = t as {
      id: string
      status: string
      user_a_id: string
      user_b_id: string
      user_c_id: string
      a_gives_ids: string[]
      b_gives_ids: string[]
      c_gives_ids: string[]
      user_a_status: string
      user_b_status: string
      user_c_status: string
      created_at: string
      accepted_at: string | null
      requested_by: string
      verified_at: string | null
    }

    // Cycle: A→B→C→A. Determine my position.
    let myGivingIds: string[]
    let myReceivingIds: string[]
    let giveToId: string
    let receiveFromId: string
    let thirdId: string
    let thirdGives: string[]
    let thirdReceives: string[]
    let myStatus: string
    let otherStatuses: Array<{ name: string; status: string }>

    let thirdGivesToId: string

    if (trade.user_a_id === userId) {
      // A gives to B, receives from C. Third party is B who gives to C.
      myGivingIds = trade.a_gives_ids
      myReceivingIds = trade.c_gives_ids
      giveToId = trade.user_b_id
      receiveFromId = trade.user_c_id
      thirdId = trade.user_b_id
      thirdGives = trade.b_gives_ids
      thirdGivesToId = trade.user_c_id
      thirdReceives = trade.a_gives_ids
      myStatus = trade.user_a_status
      otherStatuses = [
        { name: nameMap[trade.user_b_id] ?? 'Usuário', status: trade.user_b_status },
        { name: nameMap[trade.user_c_id] ?? 'Usuário', status: trade.user_c_status },
      ]
    } else if (trade.user_b_id === userId) {
      // B gives to C, receives from A. Third party is C who gives to A.
      myGivingIds = trade.b_gives_ids
      myReceivingIds = trade.a_gives_ids
      giveToId = trade.user_c_id
      receiveFromId = trade.user_a_id
      thirdId = trade.user_c_id
      thirdGives = trade.c_gives_ids
      thirdGivesToId = trade.user_a_id
      thirdReceives = trade.b_gives_ids
      myStatus = trade.user_b_status
      otherStatuses = [
        { name: nameMap[trade.user_a_id] ?? 'Usuário', status: trade.user_a_status },
        { name: nameMap[trade.user_c_id] ?? 'Usuário', status: trade.user_c_status },
      ]
    } else {
      // C gives to A, receives from B. Third party is A who gives to B.
      myGivingIds = trade.c_gives_ids
      myReceivingIds = trade.b_gives_ids
      giveToId = trade.user_a_id
      receiveFromId = trade.user_b_id
      thirdId = trade.user_a_id
      thirdGives = trade.a_gives_ids
      thirdGivesToId = trade.user_b_id
      thirdReceives = trade.c_gives_ids
      myStatus = trade.user_c_status
      otherStatuses = [
        { name: nameMap[trade.user_a_id] ?? 'Usuário', status: trade.user_a_status },
        { name: nameMap[trade.user_b_id] ?? 'Usuário', status: trade.user_b_status },
      ]
    }

    return {
      id: trade.id,
      status: trade.status,
      myGivingIds,
      myReceivingIds,
      giveTo: { id: giveToId, name: nameMap[giveToId] ?? 'Usuário' },
      receiveFrom: { id: receiveFromId, name: nameMap[receiveFromId] ?? 'Usuário' },
      thirdParty: {
        id: thirdId,
        name: nameMap[thirdId] ?? 'Usuário',
        givesIds: thirdGives,
        givesToName: nameMap[thirdGivesToId] ?? 'Usuário',
        receivesIds: thirdReceives,
      },
      myApprovalStatus: myStatus,
      otherStatuses,
      createdAt: trade.created_at,
      acceptedAt: trade.accepted_at,
      isRequester: trade.requested_by === userId,
      verified: !!trade.verified_at,
    }
  })
}

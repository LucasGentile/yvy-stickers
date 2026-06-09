'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { formatName } from '@/lib/format'

export type PurchaseRequest = {
  id: string
  buyerId: string
  buyerName: string
  buyerApartment: string
  buyerTower: string
  sellerId: string
  sellerName: string
  sellerApartment: string
  sellerTower: string
  stickerIds: string[]
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  message: string | null
  createdAt: string
}

export type PurchaseRequestsResult = {
  incoming: PurchaseRequest[]
  outgoing: PurchaseRequest[]
}

const THIRTY_DAYS_AGO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString()
}

export async function getPurchaseRequests(userId: string): Promise<PurchaseRequestsResult> {
  if (!userId) return { incoming: [], outgoing: [] }

  const cutoff = THIRTY_DAYS_AGO()

  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('purchase_requests')
      .select('*')
      .eq('seller_id', userId)
      .or(`status.eq.pending,created_at.gte.${cutoff}`)
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin as any)
      .from('purchase_requests')
      .select('*')
      .eq('buyer_id', userId)
      .or(`status.eq.pending,created_at.gte.${cutoff}`)
      .order('created_at', { ascending: false }),
  ])

  const allRows = [...(incoming ?? []), ...(outgoing ?? [])]
  if (allRows.length === 0) return { incoming: [], outgoing: [] }

  const userIds = [...new Set(allRows.flatMap((r) => [r.buyer_id, r.seller_id]))]

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, name, apartment, tower')
    .in('id', userIds)

  const userMap = Object.fromEntries((users ?? []).map((u) => [u.id, u]))

  function mapRow(r: Record<string, unknown>): PurchaseRequest {
    const buyer = userMap[r.buyer_id as string]
    const seller = userMap[r.seller_id as string]
    return {
      id: r.id as string,
      buyerId: r.buyer_id as string,
      buyerName: formatName(buyer?.name ?? 'Usuário'),
      buyerApartment: buyer?.apartment ?? '',
      buyerTower: buyer?.tower ?? '',
      sellerId: r.seller_id as string,
      sellerName: formatName(seller?.name ?? 'Usuário'),
      sellerApartment: seller?.apartment ?? '',
      sellerTower: seller?.tower ?? '',
      stickerIds: (r.sticker_ids as string[]) ?? [],
      status: r.status as PurchaseRequest['status'],
      message: (r.message as string | null) ?? null,
      createdAt: r.created_at as string,
    }
  }

  return {
    incoming: (incoming ?? []).map(mapRow),
    outgoing: (outgoing ?? []).map(mapRow),
  }
}

export async function getIncomingPurchaseRequestCount(userId: string): Promise<number> {
  if (!userId) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabaseAdmin as any)
    .from('purchase_requests')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', userId)
    .eq('status', 'pending')
  return count ?? 0
}

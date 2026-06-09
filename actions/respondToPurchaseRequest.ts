'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decrementDupes, addToCollection } from './tradeOps'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type RespondPurchaseResult = { success: true } | { success: false; error: string }

export async function respondToPurchaseRequest(
  userId: string,
  input: { requestId: string; action: 'accept' | 'reject' | 'cancel' }
): Promise<RespondPurchaseResult> {
  if (!userId || !input.requestId) {
    return { success: false, error: 'Parâmetros inválidos.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: req } = await (supabaseAdmin as any)
    .from('purchase_requests')
    .select('id, buyer_id, seller_id, sticker_ids, status')
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!req) {
    return { success: false, error: 'Pedido não encontrado ou já processado.' }
  }

  if (input.action === 'cancel' && req.buyer_id !== userId) {
    return { success: false, error: 'Apenas quem fez o pedido pode cancelá-lo.' }
  }
  if ((input.action === 'accept' || input.action === 'reject') && req.seller_id !== userId) {
    return { success: false, error: 'Apenas o vendedor pode aceitar ou recusar.' }
  }

  if (input.action === 'accept') {
    // Fetch both users' input_mode for addToCollection
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, input_mode, name')
      .in('id', [req.buyer_id, req.seller_id])

    const buyerMode = users?.find((u) => u.id === req.buyer_id)?.input_mode ?? 'have'
    const sellerName = formatName(users?.find((u) => u.id === req.seller_id)?.name ?? 'Usuário')
    const buyerName = formatName(users?.find((u) => u.id === req.buyer_id)?.name ?? 'Usuário')

    // Effectuate: decrement seller dupes, add to buyer's collection
    await Promise.all([
      decrementDupes(req.seller_id, req.sticker_ids),
      addToCollection(req.buyer_id, buyerMode, req.sticker_ids),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('purchase_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', req.id)

    logAction(req.seller_id, 'purchase_request_accepted', {
      requestId: req.id,
      buyerName,
      buyerId: req.buyer_id,
      stickerIds: req.sticker_ids,
      stickerCount: req.sticker_ids.length,
    })
    logAction(req.buyer_id, 'purchase_request_received', {
      requestId: req.id,
      sellerName,
      sellerId: req.seller_id,
      stickerIds: req.sticker_ids,
      stickerCount: req.sticker_ids.length,
    })
  } else {
    const newStatus = input.action === 'reject' ? 'rejected' : 'cancelled'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabaseAdmin as any)
      .from('purchase_requests')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', req.id)

    const action =
      input.action === 'reject' ? 'purchase_request_rejected' : 'purchase_request_cancelled'

    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [req.buyer_id, req.seller_id])

    const sellerName = formatName(users?.find((u) => u.id === req.seller_id)?.name ?? 'Usuário')
    const buyerName = formatName(users?.find((u) => u.id === req.buyer_id)?.name ?? 'Usuário')

    if (input.action === 'reject') {
      logAction(req.seller_id, action, { requestId: req.id, buyerName, buyerId: req.buyer_id })
    } else {
      logAction(req.buyer_id, action, {
        requestId: req.id,
        sellerName,
        sellerId: req.seller_id,
      })
    }
  }

  return { success: true }
}

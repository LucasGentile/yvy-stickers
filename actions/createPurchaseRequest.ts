'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { logAction } from './logAction'
import { formatName } from '@/lib/format'

export type CreatePurchaseResult =
  | { success: true; requestId: string }
  | { success: false; error: string }

export async function createPurchaseRequest(
  buyerId: string,
  input: { sellerId: string; stickerIds: string[]; message?: string }
): Promise<CreatePurchaseResult> {
  if (!buyerId || !input.sellerId) {
    return { success: false, error: 'Usuários inválidos.' }
  }
  if (buyerId === input.sellerId) {
    return { success: false, error: 'Não é possível solicitar figurinhas de si mesmo.' }
  }
  if (!input.stickerIds || input.stickerIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha selecionada.' }
  }

  // Check for an existing pending request between same buyer and seller
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabaseAdmin as any)
    .from('purchase_requests')
    .select('id')
    .eq('buyer_id', buyerId)
    .eq('seller_id', input.sellerId)
    .eq('status', 'pending')
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      error: 'Você já tem um pedido pendente para este vendedor.',
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseAdmin as any)
    .from('purchase_requests')
    .insert({
      buyer_id: buyerId,
      seller_id: input.sellerId,
      sticker_ids: input.stickerIds,
      message: input.message ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    return { success: false, error: 'Erro ao criar pedido.' }
  }

  ;(async () => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .in('id', [buyerId, input.sellerId])
    const sellerName = formatName(users?.find((u) => u.id === input.sellerId)?.name ?? 'Usuário')
    logAction(buyerId, 'purchase_request_sent', {
      requestId: data.id,
      sellerName,
      sellerId: input.sellerId,
      stickerIds: input.stickerIds,
      stickerCount: input.stickerIds.length,
    })
  })()

  return { success: true, requestId: data.id }
}

'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Deactivates accounts that registered more than 3 days ago and never added any sticker.
// These are users who signed up just to browse and are not actively participating.
export async function deactivateStaleUsers(): Promise<void> {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: candidates } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('is_active', true)
    .lt('created_at', cutoff)

  if (!candidates || candidates.length === 0) return

  const candidateIds = candidates.map((u) => u.id)
  const candidateIdSet = new Set(candidateIds)

  // Use the RPC (returns one row per user) instead of raw user_stickers rows,
  // which would exceed PostgREST's 1000-row default limit and cause false negatives.
  // If the RPC fails, bail out entirely — never deactivate when sticker data is unavailable.
  const { data: stickerCounts, error: rpcError } = await supabaseAdmin.rpc(
    'get_sticker_counts_by_user'
  )
  if (rpcError || !stickerCounts) return

  const withStickerSet = new Set(
    stickerCounts.filter((r) => candidateIdSet.has(r.user_id)).map((r) => r.user_id)
  )
  const toDeactivate = candidateIds.filter((id) => !withStickerSet.has(id))

  if (toDeactivate.length === 0) return

  await supabaseAdmin.from('users').update({ is_active: false }).in('id', toDeactivate)
}

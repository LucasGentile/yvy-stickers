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

  const { data: withStickers } = await supabaseAdmin
    .from('user_stickers')
    .select('user_id')
    .in('user_id', candidateIds)

  const withStickerSet = new Set((withStickers ?? []).map((r) => r.user_id))
  const toDeactivate = candidateIds.filter((id) => !withStickerSet.has(id))

  if (toDeactivate.length === 0) return

  await supabaseAdmin.from('users').update({ is_active: false }).in('id', toDeactivate)
}

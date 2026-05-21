'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AlreadyOwnedResult = {
  myAlreadyOwned: string[]
  theirAlreadyOwned: string[]
}

export async function checkAlreadyOwnedIncoming(
  userId: string,
  otherUserId: string,
  myReceivingIds: string[],
  myGivingIds: string[]
): Promise<AlreadyOwnedResult> {
  const empty: AlreadyOwnedResult = { myAlreadyOwned: [], theirAlreadyOwned: [] }
  if (!userId || !otherUserId) return empty
  if (myReceivingIds.length === 0 && myGivingIds.length === 0) return empty

  const [{ data: myStickers }, { data: theirStickers }] = await Promise.all([
    myReceivingIds.length > 0
      ? supabaseAdmin
          .from('user_stickers')
          .select('sticker_id')
          .eq('user_id', userId)
          .in('sticker_id', myReceivingIds)
      : Promise.resolve({ data: [] }),
    myGivingIds.length > 0
      ? supabaseAdmin
          .from('user_stickers')
          .select('sticker_id')
          .eq('user_id', otherUserId)
          .in('sticker_id', myGivingIds)
      : Promise.resolve({ data: [] }),
  ])

  return {
    myAlreadyOwned: (myStickers ?? []).map((r) => r.sticker_id),
    theirAlreadyOwned: (theirStickers ?? []).map((r) => r.sticker_id),
  }
}

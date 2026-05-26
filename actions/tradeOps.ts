import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function decrementDupes(userId: string, ids: string[]) {
  await Promise.all(
    ids.map(async (sid) => {
      const { data } = await supabaseAdmin
        .from('user_duplicates')
        .select('count')
        .eq('user_id', userId)
        .eq('sticker_id', sid)
        .maybeSingle()
      if (!data) return
      if (data.count > 1) {
        await supabaseAdmin
          .from('user_duplicates')
          .update({ count: data.count - 1 })
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      } else {
        await supabaseAdmin
          .from('user_duplicates')
          .delete()
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      }
    })
  )
}

export async function incrementDuplicate(userId: string, sid: string) {
  const { data } = await supabaseAdmin
    .from('user_duplicates')
    .select('count')
    .eq('user_id', userId)
    .eq('sticker_id', sid)
    .maybeSingle()
  if (data) {
    await supabaseAdmin
      .from('user_duplicates')
      .update({ count: data.count + 1 })
      .eq('user_id', userId)
      .eq('sticker_id', sid)
  } else {
    await supabaseAdmin
      .from('user_duplicates')
      .insert({ user_id: userId, sticker_id: sid, count: 1 })
  }
}

export async function addToCollection(userId: string, mode: string, ids: string[]) {
  if (ids.length === 0) return

  const { data: existing } = await supabaseAdmin
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
    .in('sticker_id', ids)
  const existingSet = new Set((existing ?? []).map((r) => r.sticker_id))

  if (mode === 'have') {
    const newIds = ids.filter((id) => !existingSet.has(id))
    const alreadyOwnedIds = ids.filter((id) => existingSet.has(id))
    if (newIds.length > 0) {
      await supabaseAdmin.from('user_stickers').upsert(
        newIds.map((sid) => ({ user_id: userId, sticker_id: sid })),
        { onConflict: 'user_id,sticker_id' }
      )
    }
    await Promise.all(alreadyOwnedIds.map((sid) => incrementDuplicate(userId, sid)))
  } else {
    const stillNeededIds = ids.filter((id) => existingSet.has(id))
    const alreadyOwnedIds = ids.filter((id) => !existingSet.has(id))
    if (stillNeededIds.length > 0) {
      await supabaseAdmin
        .from('user_stickers')
        .delete()
        .eq('user_id', userId)
        .in('sticker_id', stillNeededIds)
    }
    await Promise.all(alreadyOwnedIds.map((sid) => incrementDuplicate(userId, sid)))
  }
}

export async function restoreDupe(userId: string, ids: string[]) {
  await Promise.all(
    ids.map(async (sid) => {
      const { data } = await supabaseAdmin
        .from('user_duplicates')
        .select('count')
        .eq('user_id', userId)
        .eq('sticker_id', sid)
        .maybeSingle()
      if (data) {
        await supabaseAdmin
          .from('user_duplicates')
          .update({ count: data.count + 1 })
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      } else {
        await supabaseAdmin
          .from('user_duplicates')
          .insert({ user_id: userId, sticker_id: sid, count: 1 })
      }
    })
  )
}

export async function removeFromCollection(userId: string, ids: string[]) {
  if (ids.length === 0) return
  await Promise.all(
    ids.map(async (sid) => {
      const { data: dupe } = await supabaseAdmin
        .from('user_duplicates')
        .select('count')
        .eq('user_id', userId)
        .eq('sticker_id', sid)
        .maybeSingle()
      if (dupe) {
        if (dupe.count > 1) {
          await supabaseAdmin
            .from('user_duplicates')
            .update({ count: dupe.count - 1 })
            .eq('user_id', userId)
            .eq('sticker_id', sid)
        } else {
          await supabaseAdmin
            .from('user_duplicates')
            .delete()
            .eq('user_id', userId)
            .eq('sticker_id', sid)
        }
      } else {
        await supabaseAdmin
          .from('user_stickers')
          .delete()
          .eq('user_id', userId)
          .eq('sticker_id', sid)
      }
    })
  )
}

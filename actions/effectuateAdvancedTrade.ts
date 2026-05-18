'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type AdvancedTradeEffectuateResult = { success: true } | { success: false; error: string }

async function decrementDupes(userId: string, ids: string[]) {
  for (const sid of ids) {
    const { data } = await supabaseAdmin
      .from('user_duplicates')
      .select('count')
      .eq('user_id', userId)
      .eq('sticker_id', sid)
      .maybeSingle()
    if (!data) continue
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
  }
}

async function incrementDuplicate(userId: string, sid: string) {
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

async function addToCollection(userId: string, mode: string, ids: string[]) {
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
    for (const sid of alreadyOwnedIds) {
      await incrementDuplicate(userId, sid)
    }
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
    for (const sid of alreadyOwnedIds) {
      await incrementDuplicate(userId, sid)
    }
  }
}

export async function effectuateAdvancedTrade(
  userAId: string,
  userBId: string,
  userCId: string,
  aGivesIds: string[],
  bGivesIds: string[],
  cGivesIds: string[]
): Promise<AdvancedTradeEffectuateResult> {
  if (aGivesIds.length === 0 && bGivesIds.length === 0 && cGivesIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha na troca.' }
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, input_mode')
    .in('id', [userAId, userBId, userCId])

  if (!users || users.length < 3) {
    return { success: false, error: 'Usuários não encontrados.' }
  }

  const modeMap = Object.fromEntries(users.map((u) => [u.id, u.input_mode]))

  // Validate availability: check each giver still has the dupes
  for (const [giverId, ids] of [
    [userAId, aGivesIds],
    [userBId, bGivesIds],
    [userCId, cGivesIds],
  ] as [string, string[]][]) {
    const { data: dupes } = await supabaseAdmin
      .from('user_duplicates')
      .select('sticker_id, count')
      .eq('user_id', giverId)
      .in('sticker_id', ids)
    const dupeMap = Object.fromEntries((dupes ?? []).map((d) => [d.sticker_id, d.count]))
    const missing = ids.filter((id) => (dupeMap[id] ?? 0) <= 0)
    if (missing.length > 0) {
      return {
        success: false,
        error: `Figurinha(s) não disponível(eis): ${missing.join(', ')}`,
      }
    }
  }

  // Leg A→B: A gives, B receives
  await decrementDupes(userAId, aGivesIds)
  await addToCollection(userBId, modeMap[userBId], aGivesIds)

  // Leg B→C: B gives, C receives
  await decrementDupes(userBId, bGivesIds)
  await addToCollection(userCId, modeMap[userCId], bGivesIds)

  // Leg C→A: C gives, A receives
  await decrementDupes(userCId, cGivesIds)
  await addToCollection(userAId, modeMap[userAId], cGivesIds)

  return { success: true }
}

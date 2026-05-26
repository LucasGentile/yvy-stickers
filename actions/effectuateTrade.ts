'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decrementDupes, addToCollection } from './tradeOps'

export type TradeResult = { success: true } | { success: false; error: string }

export async function effectuateTrade(
  currentUserId: string,
  otherUserId: string,
  givingIds: string[],
  receivingIds: string[]
): Promise<TradeResult> {
  if (givingIds.length === 0 && receivingIds.length === 0) {
    return { success: false, error: 'Nenhuma figurinha selecionada.' }
  }

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, input_mode')
    .in('id', [currentUserId, otherUserId])

  if (!users || users.length < 2) {
    return { success: false, error: 'Usuários não encontrados.' }
  }

  const currentMode = users.find((u) => u.id === currentUserId)!.input_mode
  const otherMode = users.find((u) => u.id === otherUserId)!.input_mode

  await Promise.all([
    (async () => {
      await decrementDupes(currentUserId, givingIds)
      await addToCollection(currentUserId, currentMode, receivingIds)
    })(),
    (async () => {
      await decrementDupes(otherUserId, receivingIds)
      await addToCollection(otherUserId, otherMode, givingIds)
    })(),
  ])

  return { success: true }
}

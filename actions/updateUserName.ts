'use server'

import { supabase } from '@/lib/supabase'

export type UpdateUserNameResult = { success: true } | { success: false; error: string }

export async function updateUserName(
  userId: string,
  newName: string
): Promise<UpdateUserNameResult> {
  const trimmed = newName.trim()

  if (!trimmed) {
    return { success: false, error: 'O nome não pode ficar vazio.' }
  }

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .ilike('name', trimmed)
    .neq('id', userId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Esse nome já está em uso por outro morador.' }
  }

  const { error } = await supabase.from('users').update({ name: trimmed }).eq('id', userId)

  if (error) {
    return { success: false, error: 'Erro ao atualizar o nome. Tente novamente.' }
  }

  return { success: true }
}

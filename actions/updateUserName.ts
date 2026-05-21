'use server'

import { supabase } from '@/lib/supabase'
import { normalizeText } from '@/lib/normalize'

export type UpdateUserNameResult = { success: true } | { success: false; error: string }

export async function updateUserName(userId: string, newName: string): Promise<UpdateUserNameResult> {
  const trimmed = newName.trim()

  if (!trimmed) {
    return { success: false, error: 'O nome não pode ficar vazio.' }
  }

  if (trimmed.split(/\s+/).length < 2) {
    return { success: false, error: 'Informe nome e sobrenome.' }
  }

  const normalized = normalizeText(trimmed)

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('name', normalized)
    .neq('id', userId)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Esse nome já está em uso por outro morador.' }
  }

  const { error } = await supabase
    .from('users')
    .update({ name: normalized })
    .eq('id', userId)

  if (error) {
    return { success: false, error: 'Erro ao atualizar o nome. Tente novamente.' }
  }

  return { success: true }
}

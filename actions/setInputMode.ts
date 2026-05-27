'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function setInputMode(
  userId: string,
  mode: 'have' | 'need'
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('users').update({ input_mode: mode }).eq('id', userId)

  if (error) {
    return { success: false, error: 'Erro ao salvar modo. Tente novamente.' }
  }

  return { success: true }
}

'use server'

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'
import { normalizeText } from '@/lib/normalize'

export type LoginResult =
  | { success: true; userId: string; displayKey: string }
  | { success: false; error: string }

export async function loginByPhone(formData: FormData): Promise<LoginResult> {
  const phone = formData.get('phone') as string

  if (!phone?.trim()) {
    return { success: false, error: 'Informe seu WhatsApp.' }
  }

  const { data } = await supabase
    .from('users')
    .select('id, display_key')
    .eq('phone', normalizeText(phone))
    .maybeSingle()

  if (!data) {
    return {
      success: false,
      error: 'Número não encontrado. Verifique o DDD ou faça um novo cadastro.',
    }
  }

  return { success: true, userId: data.id, displayKey: data.display_key }
}

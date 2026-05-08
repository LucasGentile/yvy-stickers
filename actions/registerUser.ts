'use server'

import { supabase } from '@/lib/supabase'
import { normalizeText, buildDisplayKey } from '@/lib/normalize'

export type RegisterUserResult =
  | { success: true; userId: string; displayKey: string }
  | { success: false; error: string }

export async function registerUser(formData: FormData): Promise<RegisterUserResult> {
  const name = formData.get('name') as string
  const apartment = formData.get('apartment') as string
  const tower = formData.get('tower') as string
  const phone = formData.get('phone') as string

  if (!name || !apartment || !tower || !phone) {
    return { success: false, error: 'Todos os campos são obrigatórios.' }
  }

  if (name.trim().split(/\s+/).length < 2) {
    return { success: false, error: 'Informe nome e sobrenome.' }
  }

  if (!/^\d{4}$/.test(apartment.trim())) {
    return { success: false, error: 'O apartamento deve ter exatamente 4 dígitos.' }
  }

  if (!/^\d{1,2}$/.test(tower.trim())) {
    return { success: false, error: 'A torre deve ter 1 ou 2 dígitos.' }
  }

  const normalizedPhone = normalizeText(phone)
  const normalizedName = normalizeText(name)
  const normalizedApartment = normalizeText(apartment)
  const normalizedTower = normalizeText(tower)
  const displayKey = buildDisplayKey(normalizedName, normalizedApartment, normalizedTower)

  // Check if phone already exists → returning user
  const { data: existing } = await supabase
    .from('users')
    .select('id, display_key')
    .eq('phone', normalizedPhone)
    .maybeSingle()

  if (existing) {
    return { success: true, userId: existing.id, displayKey: existing.display_key }
  }

  // Check if name is already taken
  const { data: nameTaken } = await supabase
    .from('users')
    .select('id')
    .eq('name', normalizedName)
    .maybeSingle()

  if (nameTaken) {
    return {
      success: false,
      error: 'Esse nome já está cadastrado. Use um apelido ou nome diferente.',
    }
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      name: normalizedName,
      apartment: normalizedApartment,
      tower: normalizedTower,
      phone: normalizedPhone,
      input_mode: 'have',
      display_key: displayKey,
    })
    .select('id, display_key')
    .single()

  if (error || !data) {
    return { success: false, error: 'Erro ao cadastrar. Tente novamente.' }
  }

  return { success: true, userId: data.id, displayKey: data.display_key }
}

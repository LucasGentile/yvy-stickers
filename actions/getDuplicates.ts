'use server'

import { supabase } from '@/lib/supabase'

export type DuplicateEntry = {
  stickerId: string
  count: number
}

export async function getDuplicates(userId: string): Promise<DuplicateEntry[]> {
  const { data } = await supabase
    .from('user_duplicates')
    .select('sticker_id, count')
    .eq('user_id', userId)
    .order('sticker_id')

  return (data ?? []).map((r) => ({ stickerId: r.sticker_id, count: r.count }))
}

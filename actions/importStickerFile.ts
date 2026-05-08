'use server'

import { supabase } from '@/lib/supabase'
import { logAction } from './logAction'

export type ImportStickerFileResult =
  | {
      success: true
      totalStickers: number
      addedToAlbum: number
      removedFromAlbum: number
      newDuplicates: number
      totalDuplicateCopies: number
      failedStickers: string[]
      failedDuplicates: string[]
    }
  | { success: false; error: string }

async function insertWithFallback(
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ failed: string[] }> {
  if (rows.length === 0) return { failed: [] }

  const { error } = await supabase.from(table).insert(rows)
  if (!error) return { failed: [] }

  // Bulk failed — retry individually to isolate bad rows
  const failed: string[] = []
  for (const row of rows) {
    const { error: e } = await supabase.from(table).insert(row)
    if (e) {
      const id = (row.sticker_id as string) ?? JSON.stringify(row)
      failed.push(id)
    }
  }
  return { failed }
}

export async function importStickerFile(
  userId: string,
  stickerIds: string[],
  counts: Record<string, number>
): Promise<ImportStickerFileResult> {
  if (!userId) return { success: false, error: 'Usuário não identificado.' }

  // Fetch existing stickers for delta calculation
  const { data: existing } = await supabase
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)

  const existingSet = new Set((existing ?? []).map((r) => r.sticker_id as string))
  const newSet = new Set(stickerIds)
  const addedToAlbum = stickerIds.filter((id) => !existingSet.has(id)).length
  const removedFromAlbum = [...existingSet].filter((id) => !newSet.has(id)).length

  // Replace user_stickers
  const { error: deleteStickersError } = await supabase
    .from('user_stickers')
    .delete()
    .eq('user_id', userId)

  if (deleteStickersError) return { success: false, error: 'Erro ao limpar álbum.' }

  const stickerRows = stickerIds.map((sticker_id) => ({ user_id: userId, sticker_id }))
  const { failed: failedStickers } = await insertWithFallback('user_stickers', stickerRows)

  // Replace user_duplicates
  const { error: deleteDupError } = await supabase
    .from('user_duplicates')
    .delete()
    .eq('user_id', userId)

  if (deleteDupError) return { success: false, error: 'Erro ao limpar repetidas.' }

  const duplicateRows = Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([sticker_id, count]) => ({ user_id: userId, sticker_id, count: count - 1 }))

  const { failed: failedDuplicates } = await insertWithFallback('user_duplicates', duplicateRows)

  const savedDuplicates = duplicateRows.filter((r) => !failedDuplicates.includes(r.sticker_id))
  const totalDuplicateCopies = savedDuplicates.reduce((sum, r) => sum + r.count, 0)

  logAction(userId, 'file_import', {
    total: stickerIds.length,
    added: addedToAlbum,
    removed: removedFromAlbum,
    duplicateItems: savedDuplicates.length,
    duplicateCopies: totalDuplicateCopies,
    failedStickers,
    failedDuplicates,
  })

  return {
    success: true,
    totalStickers: stickerIds.length,
    addedToAlbum,
    removedFromAlbum,
    newDuplicates: savedDuplicates.length,
    totalDuplicateCopies,
    failedStickers,
    failedDuplicates,
  }
}

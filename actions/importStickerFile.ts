'use server'

import { supabase } from '@/lib/supabase'
import { logAction } from './logAction'

export type ImportStickerFileResult =
  | {
      success: true
      totalStickers: number
      addedToAlbum: number
      addedToAlbumIds: string[]
      removedFromAlbum: number
      newDuplicates: number
      duplicateIds: string[]
      totalDuplicateCopies: number
      failedStickers: string[]
      failedDuplicates: string[]
    }
  | { success: false; error: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

async function insertWithFallback(
  table: string,
  rows: Record<string, unknown>[]
): Promise<{ failed: string[] }> {
  if (rows.length === 0) return { failed: [] }
  const { error } = await db.from(table).insert(rows)
  if (!error) return { failed: [] }

  const failed: string[] = []
  for (const row of rows) {
    const { error: e } = await db.from(table).insert(row)
    if (e) failed.push((row.sticker_id as string) ?? JSON.stringify(row))
  }
  return { failed }
}

async function upsertDupesWithFallback(
  rows: { user_id: string; sticker_id: string; count: number }[]
): Promise<{ failed: string[] }> {
  if (rows.length === 0) return { failed: [] }
  const BATCH = 500
  const failed: string[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await db
      .from('user_duplicates')
      .upsert(batch, { onConflict: 'user_id,sticker_id' })
    if (!error) continue
    for (const row of batch) {
      const { error: e } = await db
        .from('user_duplicates')
        .upsert(row, { onConflict: 'user_id,sticker_id' })
      if (e) failed.push(row.sticker_id)
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

  // Fetch current state
  const [{ data: existing }, { data: existingDupes }] = await Promise.all([
    supabase.from('user_stickers').select('sticker_id').eq('user_id', userId),
    supabase.from('user_duplicates').select('sticker_id, count').eq('user_id', userId),
  ])

  const existingSet = new Set((existing ?? []).map((r) => r.sticker_id as string))
  const existingDupeMap: Record<string, number> = {}
  for (const r of existingDupes ?? []) existingDupeMap[r.sticker_id as string] = r.count as number

  // Stickers to add to album (not already there)
  const addedToAlbumIds = stickerIds.filter((id) => !existingSet.has(id))

  // Build duplicate increments:
  // - stickers in file that are already in the album → +1 duplicate each (overlap)
  // - stickers appearing more than once in file → +(count-1) duplicates each
  const dupeIncrements: Record<string, number> = {}
  for (const id of stickerIds) {
    if (existingSet.has(id)) dupeIncrements[id] = (dupeIncrements[id] ?? 0) + 1
  }
  for (const [id, count] of Object.entries(counts)) {
    if (count > 1) dupeIncrements[id] = (dupeIncrements[id] ?? 0) + (count - 1)
  }

  // Merge increments with existing duplicate counts
  const mergedDupeRows = Object.entries(dupeIncrements).map(([sticker_id, inc]) => ({
    user_id: userId,
    sticker_id,
    count: (existingDupeMap[sticker_id] ?? 0) + inc,
  }))

  // Insert only new album stickers (never remove existing ones)
  const stickerRows = addedToAlbumIds.map((sticker_id) => ({ user_id: userId, sticker_id }))
  const { failed: failedStickers } = await insertWithFallback('user_stickers', stickerRows)

  // Upsert duplicate counts (merge with existing)
  const { failed: failedDuplicates } = await upsertDupesWithFallback(mergedDupeRows)

  const savedDupeIds = mergedDupeRows
    .filter((r) => !failedDuplicates.includes(r.sticker_id))
    .map((r) => r.sticker_id)

  const newDuplicateCopies = Object.entries(dupeIncrements)
    .filter(([id]) => !failedDuplicates.includes(id))
    .reduce((s, [, inc]) => s + inc, 0)

  const totalLines = Object.values(counts).reduce((s, c) => s + c, 0)

  logAction(userId, 'file_import', {
    total: stickerIds.length,
    totalLines,
    added: addedToAlbumIds.length,
    removed: 0,
    addedToAlbumIds,
    duplicateIds: savedDupeIds,
    duplicateItems: savedDupeIds.length,
    duplicateCopies: newDuplicateCopies,
    failedStickers,
    failedDuplicates,
  })

  return {
    success: true,
    totalStickers: stickerIds.length,
    addedToAlbum: addedToAlbumIds.length,
    addedToAlbumIds,
    removedFromAlbum: 0,
    newDuplicates: savedDupeIds.length,
    duplicateIds: savedDupeIds,
    totalDuplicateCopies: newDuplicateCopies,
    failedStickers,
    failedDuplicates,
  }
}

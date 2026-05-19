/**
 * Restores a single user's stickers + duplicates from staging → prod.
 * Safe: only touches the specified user's rows, no other data is changed.
 *
 * Usage: npx tsx scripts/restore-from-staging.ts "Lucas"
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
  return env
}

const prod = loadEnv('.env.local')
const staging = loadEnv('.env.staging')

const prodDb = createClient(prod.NEXT_PUBLIC_SUPABASE_URL, prod.SUPABASE_SERVICE_KEY)
const stagingDb = createClient(staging.NEXT_PUBLIC_SUPABASE_URL, staging.SUPABASE_SERVICE_KEY)

async function findUser(db: SupabaseClient, name: string) {
  const { data } = await db.from('users').select('id, name').ilike('name', `%${name}%`)
  if (!data?.length) throw new Error(`User matching "${name}" not found`)
  if (data.length > 1) {
    console.log('Multiple matches:', data.map((u) => u.name).join(', '))
    throw new Error('Too many matches — be more specific')
  }
  return data[0]
}

async function main() {
  const name = process.argv[2]
  if (!name) {
    console.error('Usage: npx tsx scripts/restore-from-staging.ts "Name"')
    process.exit(1)
  }

  const stagingUser = await findUser(stagingDb, name)
  const prodUser = await findUser(prodDb, name)

  if (stagingUser.id !== prodUser.id) {
    throw new Error(`ID mismatch: staging=${stagingUser.id} prod=${prodUser.id}`)
  }

  const userId = prodUser.id
  console.log(`Restoring ${prodUser.name} (${userId})`)

  // Fetch staging data
  const { data: stagingStickers } = await stagingDb
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
  const { data: stagingDupes } = await stagingDb
    .from('user_duplicates')
    .select('sticker_id, count')
    .eq('user_id', userId)

  console.log(
    `  Staging: ${stagingStickers?.length} stickers, ${stagingDupes?.length} duplicate codes`
  )

  // Fetch current prod data (for comparison)
  const { data: prodStickers } = await prodDb
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', userId)
  const { data: prodDupes } = await prodDb
    .from('user_duplicates')
    .select('sticker_id, count')
    .eq('user_id', userId)
  const prodDupeCopies = (prodDupes ?? []).reduce((s, r) => s + r.count, 0)

  console.log(
    `  Prod now: ${prodStickers?.length} stickers, ${prodDupes?.length} duplicate codes (${prodDupeCopies} total copies)`
  )
  console.log()
  console.log('  This will REPLACE prod stickers and duplicates for this user with staging data.')
  console.log('  Press Ctrl+C to cancel, or wait 5 seconds to proceed...')

  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Replace stickers
  await prodDb.from('user_stickers').delete().eq('user_id', userId)
  const stickerRows = (stagingStickers ?? []).map((r) => ({
    user_id: userId,
    sticker_id: r.sticker_id,
  }))
  if (stickerRows.length) {
    const { error } = await prodDb.from('user_stickers').insert(stickerRows)
    if (error) throw new Error(`insert stickers: ${error.message}`)
  }

  // Replace duplicates
  await prodDb.from('user_duplicates').delete().eq('user_id', userId)
  const dupeRows = (stagingDupes ?? []).map((r) => ({
    user_id: userId,
    sticker_id: r.sticker_id,
    count: r.count,
  }))
  if (dupeRows.length) {
    const { error } = await prodDb.from('user_duplicates').insert(dupeRows)
    if (error) throw new Error(`insert duplicates: ${error.message}`)
  }

  console.log(`✓ Restored: ${stickerRows.length} stickers, ${dupeRows.length} duplicate codes`)
}

main().catch((e) => {
  console.error('Error:', e.message)
  process.exit(1)
})

/**
 * Admin CLI — manage users
 *
 * Requires SUPABASE_SERVICE_KEY in .env.local (service role key, NOT anon key).
 * Get it from: Supabase dashboard → Project Settings → API → service_role key
 *
 * Usage:
 *   npx tsx scripts/admin.ts list              — list all users with approval status
 *   npx tsx scripts/admin.ts pending           — list only pending users
 *   npx tsx scripts/admin.ts approve <phone>   — approve a user
 *   npx tsx scripts/admin.ts delete <phone>    — delete a user
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually (no dotenv dependency needed)
try {
  const env = readFileSync('.env.local', 'utf8')
  for (const line of env.split('\n')) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  /* file not found — rely on existing env */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

if (!url || !key) {
  console.error(
    'Missing env vars. Add SUPABASE_SERVICE_KEY to .env.local\n' +
      '(Supabase dashboard → Project Settings → API → service_role key)'
  )
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

function normalizePhone(raw: string) {
  return raw.trim().toLowerCase()
}

async function list(pendingOnly: boolean) {
  const query = supabase
    .from('users')
    .select('name, apartment, tower, phone, approved, created_at')
    .order('created_at', { ascending: false })

  if (pendingOnly) query.eq('approved', false)

  const { data, error } = await query
  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!data?.length) {
    console.log(pendingOnly ? 'No pending users.' : 'No users found.')
    return
  }

  for (const u of data) {
    const status = u.approved ? '✓ aprovado' : '⏳ pendente'
    console.log(`[${status}] ${u.name} — Apto ${u.apartment} Torre ${u.tower} — ${u.phone}`)
  }
}

async function approve(phone: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ approved: true })
    .eq('phone', normalizePhone(phone))
    .select('name')
    .single()

  if (error || !data) {
    console.error('User not found or error:', error?.message)
    process.exit(1)
  }
  console.log(`✓ Aprovado: ${data.name}`)
}

async function deleteUser(phone: string) {
  const { data, error } = await supabase
    .from('users')
    .delete()
    .eq('phone', normalizePhone(phone))
    .select('name')
    .single()

  if (error || !data) {
    console.error('User not found or error:', error?.message)
    process.exit(1)
  }
  console.log(`✓ Deletado: ${data.name}`)
}

async function grantAdmin(phone: string) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_admin: true })
    .eq('phone', normalizePhone(phone))
    .select('name')
    .single()

  if (error || !data) {
    console.error('User not found or error:', error?.message)
    process.exit(1)
  }
  console.log(`✓ Admin concedido: ${data.name}`)
}

async function debugUser(nameFragment: string) {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, apartment, tower, input_mode, approved')
    .ilike('name', `%${nameFragment}%`)

  if (error) { console.error(error.message); process.exit(1) }
  if (!users?.length) { console.log(`No users matching "${nameFragment}"`); return }

  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_sticker_counts_by_user')
  if (rpcErr) console.warn('RPC error:', rpcErr.message)

  for (const u of users) {
    const { count } = await supabase
      .from('user_stickers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', u.id)

    const { data: dupes } = await supabase
      .from('user_duplicates')
      .select('sticker_id, count')
      .eq('user_id', u.id)

    const totalDupeCopies = (dupes ?? []).reduce((s: number, r: Record<string, unknown>) => s + (r.count as number), 0)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcRow = (rpcData ?? []).find((r: any) => r.user_id === u.id)

    console.log(`\n${u.name} — Apto ${u.apartment} Torre ${u.tower}`)
    console.log(`  id:         ${u.id}`)
    console.log(`  approved:   ${u.approved}`)
    console.log(`  input_mode: ${u.input_mode}`)
    console.log(`  user_stickers rows (direct COUNT): ${count ?? 0}`)
    console.log(`  user_stickers rows (via RPC):      ${rpcRow ? rpcRow.sticker_count : 'NOT IN RPC RESULT'}`)
    console.log(`  user_duplicates rows: ${(dupes ?? []).length} (${totalDupeCopies} extra copies)`)
  }
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)

  if (cmd === 'list') await list(false)
  else if (cmd === 'pending') await list(true)
  else if (cmd === 'approve' && arg) await approve(arg)
  else if (cmd === 'delete' && arg) await deleteUser(arg)
  else if (cmd === 'grant-admin' && arg) await grantAdmin(arg)
  else if (cmd === 'debug-user' && arg) await debugUser(arg)
  else {
    console.log(
      'Usage:\n' +
        '  npx tsx scripts/admin.ts list\n' +
        '  npx tsx scripts/admin.ts pending\n' +
        '  npx tsx scripts/admin.ts approve <phone>\n' +
        '  npx tsx scripts/admin.ts delete <phone>\n' +
        '  npx tsx scripts/admin.ts grant-admin <phone>\n' +
        '  npx tsx scripts/admin.ts debug-user <name>'
    )
  }
}

main()

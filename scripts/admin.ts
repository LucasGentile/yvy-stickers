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

  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!users?.length) {
    console.log(`No users matching "${nameFragment}"`)
    return
  }

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

    const totalDupeCopies = (dupes ?? []).reduce(
      (s: number, r: Record<string, unknown>) => s + (r.count as number),
      0
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcRow = (rpcData ?? []).find((r: any) => r.user_id === u.id)

    console.log(`\n${u.name} — Apto ${u.apartment} Torre ${u.tower}`)
    console.log(`  id:         ${u.id}`)
    console.log(`  approved:   ${u.approved}`)
    console.log(`  input_mode: ${u.input_mode}`)
    console.log(`  user_stickers rows (direct COUNT): ${count ?? 0}`)
    console.log(
      `  user_stickers rows (via RPC):      ${rpcRow ? rpcRow.sticker_count : 'NOT IN RPC RESULT'}`
    )
    console.log(`  user_duplicates rows: ${(dupes ?? []).length} (${totalDupeCopies} extra copies)`)
  }
}

async function backfillTrade(tradeId: string) {
  const { data: trade, error } = await supabase
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
    .eq('id', tradeId)
    .single()

  if (error || !trade) {
    console.error('Trade not found:', error?.message)
    process.exit(1)
  }
  if (trade.status !== 'accepted') {
    console.error(`Trade status is "${trade.status}", not accepted`)
    process.exit(1)
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', [trade.initiator_id, trade.receiver_id])

  const initiatorName = users?.find((u) => u.id === trade.initiator_id)?.name ?? 'Usuário'
  const receiverName = users?.find((u) => u.id === trade.receiver_id)?.name ?? 'Usuário'

  console.log(`\nTrade: ${trade.id}`)
  console.log(`  ${initiatorName} → ${receiverName}`)
  console.log(`  giving:    ${trade.giving_ids?.join(', ') || '(none)'}`)
  console.log(`  receiving: ${trade.receiving_ids?.join(', ') || '(none)'}`)
  console.log(`  date:      ${trade.created_at}`)

  // Insert log for receiver
  await supabase.from('audit_log').insert({
    user_id: trade.receiver_id,
    action: 'trade_accepted',
    metadata: {
      partnerName: initiatorName,
      givingIds: trade.receiving_ids ?? [],
      receivingIds: trade.giving_ids ?? [],
    },
    created_at: trade.created_at,
  })

  // Insert log for initiator
  await supabase.from('audit_log').insert({
    user_id: trade.initiator_id,
    action: 'trade_accepted',
    metadata: {
      partnerName: receiverName,
      givingIds: trade.giving_ids ?? [],
      receivingIds: trade.receiving_ids ?? [],
    },
    created_at: trade.created_at,
  })

  console.log(`✓ Backfilled audit_log for both ${initiatorName} and ${receiverName}`)
}

async function findTrades(nameFragment: string) {
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', `%${nameFragment}%`)

  if (!users?.length) {
    console.log(`No users matching "${nameFragment}"`)
    return
  }

  const ids = users.map((u) => u.id)
  const nameById = Object.fromEntries(users.map((u) => [u.id, u.name]))

  const { data: trades } = await supabase
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status, created_at')
    .or(ids.map((id) => `initiator_id.eq.${id},receiver_id.eq.${id}`).join(','))
    .order('created_at', { ascending: false })

  // Enrich with names for all involved users
  const allIds = [...new Set((trades ?? []).flatMap((t) => [t.initiator_id, t.receiver_id]))]
  const { data: allUsers } = await supabase.from('users').select('id, name').in('id', allIds)
  for (const u of allUsers ?? []) nameById[u.id] = u.name

  for (const t of trades ?? []) {
    const init = nameById[t.initiator_id] ?? t.initiator_id
    const recv = nameById[t.receiver_id] ?? t.receiver_id
    console.log(`\n[${t.status}] ${t.id} (${t.created_at.slice(0, 10)})`)
    console.log(`  ${init} → ${recv}`)
    console.log(`  giving:    ${t.giving_ids?.join(', ') || '(none)'}`)
    console.log(`  receiving: ${t.receiving_ids?.join(', ') || '(none)'}`)
  }
}

async function invertAlbum(nameFragment: string) {
  const { ALL_STICKER_IDS } = await import('../lib/stickers')

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, input_mode')
    .ilike('name', `%${nameFragment}%`)

  if (error) {
    console.error(error.message)
    process.exit(1)
  }
  if (!users?.length) {
    console.log(`No users matching "${nameFragment}"`)
    return
  }
  if (users.length > 1) {
    console.log('Multiple users matched — be more specific:')
    for (const u of users) console.log(`  ${u.name} (${u.id})`)
    process.exit(1)
  }

  const user = users[0]
  const { data: rows, error: fetchErr } = await supabase
    .from('user_stickers')
    .select('sticker_id')
    .eq('user_id', user.id)

  if (fetchErr) {
    console.error(fetchErr.message)
    process.exit(1)
  }

  const current = new Set((rows ?? []).map((r: { sticker_id: string }) => r.sticker_id))
  const complement = ALL_STICKER_IDS.filter((id) => !current.has(id))

  console.log(`\n${user.name} (input_mode: ${user.input_mode})`)
  console.log(`  current:    ${current.size} stickers`)
  console.log(`  complement: ${complement.length} stickers`)

  const { error: delErr } = await supabase.from('user_stickers').delete().eq('user_id', user.id)

  if (delErr) {
    console.error('Delete failed:', delErr.message)
    process.exit(1)
  }

  const inserts = complement.map((sticker_id) => ({ user_id: user.id, sticker_id }))
  const { error: insErr } = await supabase.from('user_stickers').insert(inserts)

  if (insErr) {
    console.error('Insert failed:', insErr.message)
    process.exit(1)
  }

  console.log(`✓ Album inverted: ${current.size} → ${complement.length} stickers`)
}

async function adminRollbackTrade(tradeId: string) {
  const { data: trade, error } = await supabase
    .from('pending_trades')
    .select('id, initiator_id, receiver_id, giving_ids, receiving_ids, status')
    .eq('id', tradeId)
    .maybeSingle()

  if (error || !trade) {
    console.error('Trade not found:', error?.message)
    process.exit(1)
  }
  if (trade.status !== 'accepted') {
    console.error(`Trade status is "${trade.status}", not "accepted" — nothing to roll back`)
    process.exit(1)
  }

  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', [trade.initiator_id, trade.receiver_id])

  const initiatorName = users?.find((u) => u.id === trade.initiator_id)?.name ?? trade.initiator_id
  const receiverName = users?.find((u) => u.id === trade.receiver_id)?.name ?? trade.receiver_id

  console.log(`\nRolling back trade ${trade.id}`)
  console.log(`  ${initiatorName} → ${receiverName}`)
  console.log(`  giving:    ${trade.giving_ids?.join(', ') || '(none)'}`)
  console.log(`  receiving: ${trade.receiving_ids?.join(', ') || '(none)'}`)

  // Mark as rolled_back (atomic check on status)
  const { data: updated } = await supabase
    .from('pending_trades')
    .update({ status: 'rolled_back' })
    .eq('id', tradeId)
    .eq('status', 'accepted')
    .select('id')
    .maybeSingle()

  if (!updated) {
    console.error('Trade already changed status during rollback — aborting')
    process.exit(1)
  }

  // Restore duplicates for both parties
  async function restoreDupe(userId: string, ids: string[]) {
    for (const sid of ids) {
      const { data } = await supabase
        .from('user_duplicates')
        .select('count')
        .eq('user_id', userId)
        .eq('sticker_id', sid)
        .maybeSingle()
      if (data) {
        await supabase
          .from('user_duplicates')
          .update({ count: data.count + 1 })
          .eq('user_id', userId)
          .eq('sticker_id', sid)
        console.log(
          `  ↩ restored dupe ${sid} for ${users?.find((u) => u.id === userId)?.name ?? userId} (count ${data.count} → ${data.count + 1})`
        )
      } else {
        await supabase
          .from('user_duplicates')
          .insert({ user_id: userId, sticker_id: sid, count: 1 })
        console.log(
          `  ↩ re-inserted dupe ${sid} for ${users?.find((u) => u.id === userId)?.name ?? userId} (count 1)`
        )
      }
    }
  }

  // Remove received stickers from collection
  async function removeFromCollection(userId: string, ids: string[]) {
    if (!ids.length) return
    await supabase.from('user_stickers').delete().eq('user_id', userId).in('sticker_id', ids)
    console.log(
      `  ↩ removed from collection of ${users?.find((u) => u.id === userId)?.name ?? userId}: ${ids.join(', ')}`
    )
  }

  // Initiator gave giving_ids → restore; received receiving_ids → remove from collection
  // Receiver gave receiving_ids → restore; received giving_ids → remove from collection
  await restoreDupe(trade.initiator_id, trade.giving_ids ?? [])
  await removeFromCollection(trade.initiator_id, trade.receiving_ids ?? [])
  await restoreDupe(trade.receiver_id, trade.receiving_ids ?? [])
  await removeFromCollection(trade.receiver_id, trade.giving_ids ?? [])

  console.log(`\n✓ Trade ${trade.id} rolled back successfully`)
}

async function main() {
  const [cmd, arg] = process.argv.slice(2)

  if (cmd === 'list') await list(false)
  else if (cmd === 'pending') await list(true)
  else if (cmd === 'approve' && arg) await approve(arg)
  else if (cmd === 'delete' && arg) await deleteUser(arg)
  else if (cmd === 'grant-admin' && arg) await grantAdmin(arg)
  else if (cmd === 'debug-user' && arg) await debugUser(arg)
  else if (cmd === 'find-trades' && arg) await findTrades(arg)
  else if (cmd === 'backfill-trade' && arg) await backfillTrade(arg)
  else if (cmd === 'admin-rollback-trade' && arg) await adminRollbackTrade(arg)
  else if (cmd === 'invert-album' && arg) await invertAlbum(arg)
  else {
    console.log(
      'Usage:\n' +
        '  npx tsx scripts/admin.ts list\n' +
        '  npx tsx scripts/admin.ts pending\n' +
        '  npx tsx scripts/admin.ts approve <phone>\n' +
        '  npx tsx scripts/admin.ts delete <phone>\n' +
        '  npx tsx scripts/admin.ts grant-admin <phone>\n' +
        '  npx tsx scripts/admin.ts debug-user <name>\n' +
        '  npx tsx scripts/admin.ts find-trades <name>\n' +
        '  npx tsx scripts/admin.ts admin-rollback-trade <tradeId>'
    )
  }
}

main()

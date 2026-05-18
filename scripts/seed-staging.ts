/**
 * Seed staging DB with a snapshot of production data.
 *
 * Reads prod credentials from .env.local and staging from .env.staging.
 * Wipes staging tables first, then copies all rows from prod in FK-safe order.
 *
 * Usage:
 *   npx tsx scripts/seed-staging.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/)
      if (match) env[match[1].trim()] = match[2].trim()
    }
  } catch {
    console.error(`Could not read ${file}`)
    process.exit(1)
  }
  return env
}

const prod = loadEnv('.env.local')
const staging = loadEnv('.env.staging')

const prodClient = createClient(prod.NEXT_PUBLIC_SUPABASE_URL, prod.SUPABASE_SERVICE_KEY)
const stagingClient = createClient(staging.NEXT_PUBLIC_SUPABASE_URL, staging.SUPABASE_SERVICE_KEY)

async function fetchAll(client: SupabaseClient, table: string): Promise<Record<string, unknown>[]> {
  const PAGE = 1000
  const rows: Record<string, unknown>[] = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select('*')
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`fetch ${table}: ${error.message}`)
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function clearTable(client: SupabaseClient, table: string) {
  const { error } = await client
    .from(table)
    .delete()
    .gte('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(`clear ${table}: ${error.message}`)
}

async function insertBatch(client: SupabaseClient, table: string, rows: Record<string, unknown>[]) {
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await client.from(table).insert(rows.slice(i, i + BATCH))
    if (error) throw new Error(`insert ${table}: ${error.message}`)
  }
}

async function copyTable(table: string) {
  process.stdout.write(`  ${table}... `)
  const rows = await fetchAll(prodClient, table)
  if (!rows.length) {
    console.log('empty')
    return
  }
  await insertBatch(stagingClient, table, rows)
  console.log(`${rows.length} rows`)
}

async function main() {
  console.log('Wiping staging tables...')
  // Delete in reverse FK order
  for (const t of ['audit_log', 'user_stickers', 'user_duplicates', 'pending_trades', 'users']) {
    process.stdout.write(`  ${t}... `)
    await clearTable(stagingClient, t)
    console.log('cleared')
  }

  console.log('\nCopying from prod...')
  // Insert in FK order
  for (const t of ['users', 'user_stickers', 'user_duplicates', 'pending_trades', 'audit_log']) {
    await copyTable(t)
  }

  console.log('\nDone. Staging is up to date.')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})

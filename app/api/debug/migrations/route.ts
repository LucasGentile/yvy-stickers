import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const ALL_MIGRATIONS = [
  '001_initial',
  '002_add_duplicates',
  '003_text_sticker_ids',
  '004_unique_name',
  '005_approval',
  '006_pending_trades',
  '007_audit_log',
  '008_admin_role',
  '009_sticker_count_rpc',
  '010_trade_rollback',
  '011_trade_rollback_partial',
  '012_deactivate_visitantes',
  '013_advanced_trade',
]

export async function GET() {
  // Query the schema_migrations table directly via RPC (raw SQL)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (supabaseAdmin as any).rpc('exec_sql', {
    query: 'SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version',
  })

  // If the RPC doesn't exist, fall back to a direct REST SQL query
  if (error) {
    // Try using the Supabase SQL endpoint directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Missing env vars', rpcError: error.message },
        { status: 500 }
      )
    }

    const sqlRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query: 'SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version',
      }),
    })

    if (!sqlRes.ok) {
      // Last resort: check tables directly
      const applied: string[] = []
      const missing: string[] = []

      for (const migration of ALL_MIGRATIONS) {
        const tableName = getTableForMigration(migration)
        if (tableName) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: tableErr } = await (supabaseAdmin as any)
            .from(tableName)
            .select('id')
            .limit(0)
          if (!tableErr) applied.push(migration)
          else missing.push(migration)
        } else {
          applied.push(`${migration} (assumed)`)
        }
      }

      return NextResponse.json({
        method: 'table-check-fallback',
        note: 'Could not query schema_migrations directly. Results based on table existence.',
        rpcError: error.message,
        applied,
        missing,
      })
    }

    const sqlData = await sqlRes.json()
    return formatResponse(sqlData)
  }

  return formatResponse(rows)
}

function formatResponse(rows: Array<{ version: string; name?: string }> | null) {
  const appliedVersions = new Set(
    (rows ?? []).map((r) => {
      const v = r.version ?? r.name ?? ''
      return v.replace(/\.sql$/, '')
    })
  )

  const results = ALL_MIGRATIONS.map((migration) => {
    const applied =
      appliedVersions.has(migration) ||
      appliedVersions.has(migration + '.sql') ||
      [...appliedVersions].some((v) => v.includes(migration))
    return { migration, applied }
  })

  return NextResponse.json({
    method: 'schema_migrations',
    raw: rows,
    summary: results,
  })
}

function getTableForMigration(migration: string): string | null {
  const map: Record<string, string> = {
    '001_initial': 'users',
    '002_add_duplicates': 'user_duplicates',
    '006_pending_trades': 'pending_trades',
    '007_audit_log': 'audit_log',
    '013_advanced_trade': 'advanced_trades',
  }
  return map[migration] ?? null
}

'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { Json } from '@/lib/database.types'

/** Fire-and-forget — never blocks the calling action. */
export async function logAction(
  userId: string,
  action: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await supabaseAdmin
    .from('audit_log')
    .insert({ user_id: userId, action, metadata: metadata as Json })
    .then(
      () => {},
      () => {}
    )
}

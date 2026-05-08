import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('uid')

  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data } = await admin.from('users').select('approved').eq('id', userId).maybeSingle()

  if (!data?.approved) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(process.env.WHATSAPP_GROUP_URL!)
}

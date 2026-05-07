import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

const GROUP_URL = process.env.WHATSAPP_GROUP_URL!

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('uid')

  if (!userId) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  const { data } = await supabaseAdmin
    .from('users')
    .select('approved')
    .eq('id', userId)
    .maybeSingle()

  if (!data?.approved) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.redirect(GROUP_URL)
}

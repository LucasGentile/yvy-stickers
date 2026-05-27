import { NextRequest, NextResponse } from 'next/server'

const MAINTENANCE_PAGE = '/maintenance'

export function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== 'true') return NextResponse.next()

  const { pathname } = request.nextUrl
  if (
    pathname === MAINTENANCE_PAGE ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  return NextResponse.redirect(new URL(MAINTENANCE_PAGE, request.url))
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$).*)'],
}

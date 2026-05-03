import { NextRequest, NextResponse } from 'next/server'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Next/static assetleri serbest
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  // Public route'lar
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/ai-sales') ||
    pathname.startsWith('/teklif') ||
    pathname.startsWith('/api/teklif') ||
    (pathname.startsWith('/api/isler/') && pathname.endsWith('/pdf'))
  ) {
    return NextResponse.next()
  }

  const token =
    req.cookies.get('token')?.value ||
    req.cookies.get('auth_token')?.value ||
    req.cookies.get('metrix-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

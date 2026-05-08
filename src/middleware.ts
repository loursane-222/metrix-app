import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  // Static asset'ler serbest
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/apple-icon') ||
    pathname.startsWith('/icon.') ||
    pathname === '/manifest.webmanifest'
  ) {
    return NextResponse.next()
  }

  // Public route'lar serbest
  if (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/yetkisiz' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/public') ||
    pathname.startsWith('/api/ai-sales') ||
    pathname.startsWith('/api/makineler-lite') ||
    pathname.startsWith('/teklif') ||
    pathname.startsWith('/api/teklif') ||
    (pathname.startsWith('/api/isler/') && pathname.endsWith('/pdf'))
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('metrix-token')?.value

  if (!token) {
    // API route'larına 401 JSON, sayfalara redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json({ hata: 'Oturum süresi doldu.' }, { status: 401 })
      res.cookies.delete('metrix-token')
      return res
    }
    const response = NextResponse.redirect(new URL('/login', req.url))
    response.cookies.delete('metrix-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

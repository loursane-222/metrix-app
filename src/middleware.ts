import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(req: NextRequest) {
  // PUBLIC OFFER ROUTES: customers must access offer pages without login
  if (
    pathname.startsWith('/teklif') ||
    pathname.startsWith('/api/teklif')
  ) {
    return NextResponse.next()
  }

const token = req.cookies.get('metrix-token')?.value
  const pathname = req.nextUrl.pathname

  const acikSayfalar = ['/login', '/register', '/teklif']
  const acikSayfa = acikSayfalar.includes(pathname)

  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024'
  )

  if (!token && !acikSayfa) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token) {
    try {
      await jwtVerify(token, secret)

      if (acikSayfa) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }

      return NextResponse.next()
    } catch {
      const response = acikSayfa
        ? NextResponse.next()
        : NextResponse.redirect(new URL('/login', req.url))

      response.cookies.set('metrix-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        expires: new Date(0),
      })

      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.png|icon.png).*)'],
}

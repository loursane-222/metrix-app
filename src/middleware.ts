import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('metrix-token')?.value
  const pathname = req.nextUrl.pathname

  const acikSayfalar = ['/login', '/register']
  const acikSayfa = acikSayfalar.includes(pathname)

  if (!token && !acikSayfa) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (token && acikSayfa) {
    try {
      const secret = new TextEncoder().encode(
        process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024'
      )
      await jwtVerify(token, secret)
      return NextResponse.redirect(new URL('/dashboard', req.url))
    } catch {
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|favicon.png|icon.png).*)'],
}
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email, password, beniHatirla } = await req.json()

    const kullanici = await prisma.user.findUnique({ where: { email } })
    if (!kullanici) {
      return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })
    }

    const sifreDoğru = await bcrypt.compare(password, kullanici.password)
    if (!sifreDoğru) {
      return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })
    }

    // Aktiflik kontrolü
    if (!kullanici.aktif) {
      return NextResponse.json({ hata: 'Hesabınız askıya alınmıştır. Lütfen destek ile iletişime geçin.' }, { status: 403 })
    }

    // Abonelik kontrolü
    if (kullanici.abonelikBitis && new Date() > kullanici.abonelikBitis) {
      return NextResponse.json({ hata: 'Abonelik süreniz dolmuştur. Lütfen yenileyin.' }, { status: 403 })
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const sureDakika = beniHatirla ? 60 * 24 * 30 : 60 * 24 // 30 gün veya 1 gün

    const token = await new SignJWT({ id: kullanici.id, email: kullanici.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${sureDakika}m`)
      .sign(secret)

    const yanit = NextResponse.json({ mesaj: 'Giriş başarılı.' })
    yanit.cookies.set('metrix-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sureDakika * 60,
      path: '/',
    })

    return yanit
  } catch {
    return NextResponse.json({ hata: 'Bir hata oluştu.' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email, password, beniHatirla } = await req.json()

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const sureDakika = beniHatirla ? 60 * 24 * 30 : 60 * 24

    const admin = await prisma.user.findUnique({ where: { email } })

    if (admin) {
      const ok = await bcrypt.compare(password, admin.password)
      if (!ok) return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })

      const token = await new SignJWT({
        id: admin.id,
        email: admin.email,
        role: 'admin',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(`${sureDakika}m`)
        .sign(secret)

      const res = NextResponse.json({ mesaj: 'Giriş başarılı.' })
      res.cookies.set('metrix-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sureDakika * 60,
        path: '/',
      })

      return res
    }

    const personel = await prisma.personel.findFirst({
      where: { email, aktif: true },
      include: { atolye: { include: { user: true } } },
    })

    if (!personel || !personel.password) {
      return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, personel.password)
    if (!ok) return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })

    const token = await new SignJWT({
      id: personel.atolye.user.id,
      email: personel.email,
      role: 'personel',
      personelId: personel.id,
      atolyeId: personel.atolyeId,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(`${sureDakika}m`)
      .sign(secret)

    const res = NextResponse.json({ mesaj: 'Giriş başarılı.' })
    res.cookies.set('metrix-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sureDakika * 60,
      path: '/',
    })

    return res
  } catch (e) {
    console.error('LOGIN ERROR:', e)
    return NextResponse.json({ hata: 'Bir hata oluştu.' }, { status: 500 })
  }
}

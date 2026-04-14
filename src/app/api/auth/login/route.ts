import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ hata: 'E-posta ve şifre zorunludur.' }, { status: 400 })
    }

    const kullanici = await prisma.user.findUnique({ where: { email } })

    if (!kullanici) {
      return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })
    }

    const sifreDogruMu = await bcrypt.compare(password, kullanici.password)

    if (!sifreDogruMu) {
      return NextResponse.json({ hata: 'E-posta veya şifre hatalı.' }, { status: 401 })
    }

    const token = jwt.sign(
      { id: kullanici.id, email: kullanici.email },
      process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024',
      { expiresIn: '7d' }
    )

    const response = NextResponse.json({ mesaj: 'Giriş başarılı.' }, { status: 200 })

    response.cookies.set('metrix-token', token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (hata) {
    console.error(hata)
    return NextResponse.json({ hata: 'Sunucu hatası.' }, { status: 500 })
  }
}
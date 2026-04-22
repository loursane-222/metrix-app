import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const prisma = new PrismaClient()

async function kullaniciAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string; email: string }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()

  const musteri = await prisma.musteri.findFirst({
    where: {
      id: body.musteriId,
      atolyeId: atolye.id
    }
  })

  if (!musteri) {
    return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })
  }

  const tahsilat = await prisma.tahsilat.create({
    data: {
      musteriId: musteri.id,
      tarih: body.tarih ? new Date(body.tarih) : new Date(),
      tutar: Number(body.tutar || 0)
    }
  })

  return NextResponse.json({ tahsilat })
}

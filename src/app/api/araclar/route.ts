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

export async function GET() {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ araclar: [] })

  const araclar = await prisma.arac.findMany({ where: { atolyeId: atolye.id } })
  return NextResponse.json({ araclar })
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Önce atölye profili oluşturun.' }, { status: 400 })

  const { aracAdi, aracTipi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikBakim, aylikSigortaKasko, aylikVergiMuayene } = await req.json()

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const aylikToplamSabitMaliyet = aylikAmortisman + aylikBakim + aylikSigortaKasko + aylikVergiMuayene

  const arac = await prisma.arac.create({
    data: {
      atolyeId: atolye.id,
      aracAdi,
      aracTipi,
      alinanBedel,
      paraBirimi,
      amortismanSuresiAy,
      aylikBakim,
      aylikSigortaKasko,
      aylikVergiMuayene,
      aylikAmortisman,
      aylikToplamSabitMaliyet,
    },
  })

  return NextResponse.json({ arac })
}

export async function DELETE(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id } = await req.json()
  await prisma.arac.delete({ where: { id } })
  return NextResponse.json({ tamam: true })
}
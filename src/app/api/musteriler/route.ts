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

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })
  if (!atolye) return NextResponse.json({ musteriler: [] })

  const musteriler = await prisma.musteri.findMany({
    where: { atolyeId: atolye.id },
    include: {
      isler: true,
      tahsilatlar: true
    },
    orderBy: [
      { firmaAdi: 'asc' },
      { ad: 'asc' },
      { soyad: 'asc' }
    ]
  })

  return NextResponse.json({ musteriler })
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()

  const firmaAdi = String(body.firmaAdi || '').trim()
  const ad = String(body.ad || '').trim()
  const soyad = String(body.soyad || '').trim()
  const telefon = String(body.telefon || '').trim()
  const email = String(body.email || '').trim()
  const acilisBakiyesi = Number(body.acilisBakiyesi || 0)
  const bakiyeTipi = String(body.bakiyeTipi || 'borc').trim().toLowerCase()

  if (!firmaAdi && !ad && !soyad) {
    return NextResponse.json({ hata: 'En az firma adı veya ad soyad girin.' }, { status: 400 })
  }

  if (bakiyeTipi !== 'borc' && bakiyeTipi !== 'alacak') {
    return NextResponse.json({ hata: 'bakiyeTipi sadece borc veya alacak olabilir.' }, { status: 400 })
  }

  const mevcut = await prisma.musteri.findFirst({
    where: {
      atolyeId: atolye.id,
      firmaAdi,
      ad,
      soyad,
      email
    }
  })

  if (mevcut) {
    return NextResponse.json({ musteri: mevcut })
  }

  const musteri = await prisma.musteri.create({
    data: {
      atolyeId: atolye.id,
      firmaAdi,
      ad,
      soyad,
      telefon,
      email,
      acilisBakiyesi,
      bakiyeTipi
    }
  })

  return NextResponse.json({ musteri })
}

export async function PUT(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()

  const id = String(body.id || '').trim()
  const firmaAdi = String(body.firmaAdi || '').trim()
  const ad = String(body.ad || '').trim()
  const soyad = String(body.soyad || '').trim()
  const telefon = String(body.telefon || '').trim()
  const email = String(body.email || '').trim()
  const acilisBakiyesi = Number(body.acilisBakiyesi || 0)
  const bakiyeTipi = String(body.bakiyeTipi || 'borc').trim().toLowerCase()

  if (!id) {
    return NextResponse.json({ hata: 'Müşteri id gerekli.' }, { status: 400 })
  }

  if (!firmaAdi && !ad && !soyad) {
    return NextResponse.json({ hata: 'En az firma adı veya ad soyad girin.' }, { status: 400 })
  }

  if (bakiyeTipi !== 'borc' && bakiyeTipi !== 'alacak') {
    return NextResponse.json({ hata: 'bakiyeTipi sadece borc veya alacak olabilir.' }, { status: 400 })
  }

  const mevcutMusteri = await prisma.musteri.findFirst({
    where: {
      id,
      atolyeId: atolye.id
    }
  })

  if (!mevcutMusteri) {
    return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })
  }

  const musteri = await prisma.musteri.update({
    where: { id },
    data: {
      firmaAdi,
      ad,
      soyad,
      telefon,
      email,
      acilisBakiyesi,
      bakiyeTipi
    }
  })

  return NextResponse.json({ musteri })
}

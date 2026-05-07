import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()

  const musteri = await prisma.musteri.findFirst({
    where: { id: body.musteriId, atolyeId: atolye.id }
  })
  if (!musteri) return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })

  // isId verilmişse o işin bu müşteriye ait olduğunu doğrula
  if (body.isId) {
    const is = await prisma.is.findFirst({
      where: { id: body.isId, musteriId: musteri.id, atolyeId: atolye.id }
    })
    if (!is) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })
  }

  const tahsilat = await prisma.tahsilat.create({
    data: {
      musteriId: musteri.id,
      isId: body.isId || null,
      tarih: body.tarih ? new Date(body.tarih) : new Date(),
      tutar: Number(body.tutar || 0)
    }
  })

  return NextResponse.json({ tahsilat })
}

export async function GET(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ tahsilatlar: [] })

  const { searchParams } = new URL(req.url)
  const musteriId = searchParams.get('musteriId')
  const isId = searchParams.get('isId')

  const tahsilatlar = await prisma.tahsilat.findMany({
    where: {
      musteri: { atolyeId: atolye.id },
      ...(musteriId ? { musteriId } : {}),
      ...(isId ? { isId } : {})
    },
    include: {
      is: { select: { id: true, teklifNo: true, urunAdi: true, satisFiyati: true } }
    },
    orderBy: { tarih: 'desc' }
  })

  return NextResponse.json({ tahsilatlar })
}

export async function DELETE(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'id gerekli.' }, { status: 400 })

  const tahsilat = await prisma.tahsilat.findFirst({
    where: { id, musteri: { atolyeId: atolye.id } }
  })
  if (!tahsilat) return NextResponse.json({ hata: 'Tahsilat bulunamadı.' }, { status: 404 })

  await prisma.tahsilat.delete({ where: { id } })
  return NextResponse.json({ basarili: true })
}

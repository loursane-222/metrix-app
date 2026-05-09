import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { getAtolyeAuth } from '@/lib/getAtolyeId'

const MUSTERI_TIPLERI = ['bayi', 'mimar', 'son_kullanici', 'muteahhit']



export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const musteriler = await prisma.musteri.findMany({
    where: { atolyeId: atolyeId },
    include: {
      isler: {
        include: {
          odemePlani: {
            include: { taksitler: { orderBy: { taksitNo: 'asc' } } }
          }
        }
      },
      tahsilatlar: {
        include: {
          is: { select: { id: true, teklifNo: true, urunAdi: true, satisFiyati: true } }
        },
        orderBy: { tarih: 'desc' }
      }
    },
    orderBy: [{ firmaAdi: 'asc' }, { ad: 'asc' }, { soyad: 'asc' }]
  })

  return NextResponse.json({ musteriler })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const body = await req.json()

  const firmaAdi = String(body.firmaAdi || '').trim()
  const ad = String(body.ad || '').trim()
  const soyad = String(body.soyad || '').trim()
  const telefon = String(body.telefon || '').trim()
  const email = String(body.email || '').trim()
  const acilisBakiyesi = Number(body.acilisBakiyesi || 0)
  const bakiyeTipi = String(body.bakiyeTipi || 'borc').trim().toLowerCase()
  const musteriTipi = String(body.musteriTipi || 'son_kullanici').trim().toLowerCase()

  if (!firmaAdi && !ad && !soyad) {
    return NextResponse.json({ hata: 'En az firma adı veya ad soyad girin.' }, { status: 400 })
  }

  if (bakiyeTipi !== 'borc' && bakiyeTipi !== 'alacak') {
    return NextResponse.json({ hata: 'bakiyeTipi sadece borc veya alacak olabilir.' }, { status: 400 })
  }

  if (!MUSTERI_TIPLERI.includes(musteriTipi)) {
    return NextResponse.json({ hata: 'Geçersiz müşteri tipi.' }, { status: 400 })
  }

  const mevcut = await prisma.musteri.findFirst({
    where: { atolyeId: atolyeId, firmaAdi, ad, soyad, email }
  })

  if (mevcut) return NextResponse.json({ musteri: mevcut })

  const musteri = await prisma.musteri.create({
    data: { atolyeId: atolyeId, firmaAdi, ad, soyad, telefon, email, acilisBakiyesi, bakiyeTipi, musteriTipi }
  })

  try {
    const { logActivity } = await import('@/lib/activityLogger')
    const musteriAdi = musteri.firmaAdi || (musteri.ad + ' ' + musteri.soyad).trim() || 'Musteri'
    await logActivity({
      atolyeId: atolyeId,
      type: 'musteri_eklendi',
      message: musteriAdi + ' adli yeni musteri kaydi olusturuldu.',
      refId: musteri.id,
      userId: auth.userId,
    })
  } catch {}
  return NextResponse.json({ musteri })
}

export async function PUT(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const body = await req.json()

  const id = String(body.id || '').trim()
  const firmaAdi = String(body.firmaAdi || '').trim()
  const ad = String(body.ad || '').trim()
  const soyad = String(body.soyad || '').trim()
  const telefon = String(body.telefon || '').trim()
  const email = String(body.email || '').trim()
  const acilisBakiyesi = Number(body.acilisBakiyesi || 0)
  const bakiyeTipi = String(body.bakiyeTipi || 'borc').trim().toLowerCase()
  const musteriTipi = String(body.musteriTipi || 'son_kullanici').trim().toLowerCase()

  if (!id) return NextResponse.json({ hata: 'Müşteri id gerekli.' }, { status: 400 })
  if (!firmaAdi && !ad && !soyad) {
    return NextResponse.json({ hata: 'En az firma adı veya ad soyad girin.' }, { status: 400 })
  }
  if (bakiyeTipi !== 'borc' && bakiyeTipi !== 'alacak') {
    return NextResponse.json({ hata: 'bakiyeTipi sadece borc veya alacak olabilir.' }, { status: 400 })
  }
  if (!MUSTERI_TIPLERI.includes(musteriTipi)) {
    return NextResponse.json({ hata: 'Geçersiz müşteri tipi.' }, { status: 400 })
  }

  const mevcutMusteri = await prisma.musteri.findFirst({ where: { id, atolyeId: atolyeId } })
  if (!mevcutMusteri) return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })

  const musteri = await prisma.musteri.update({
    where: { id },
    data: { firmaAdi, ad, soyad, telefon, email, acilisBakiyesi, bakiyeTipi, musteriTipi }
  })

  return NextResponse.json({ musteri })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'id gerekli.' }, { status: 400 })
  const musteri = await prisma.musteri.findFirst({ where: { id, atolyeId } })
  if (!musteri) return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })
  await prisma.musteri.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

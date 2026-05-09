import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'


// Müşteri tipine göre ödeme planı taksit yapısı
function odemePlanOlustur(musteriTipi: string, toplamTutar: number, onayTarihi: Date) {
  const taksitler = []

  if (musteriTipi === 'bayi') {
    // Bayi: %30 peşin, %70 teslimatta
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%30)', yuzdesi: 30, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'Teslimatta (%70)', yuzdesi: 70, gunSonra: 30 })
  } else if (musteriTipi === 'mimar') {
    // Mimar: %25 peşin, %25 imalatta, %50 teslimatta
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%25)', yuzdesi: 25, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%25)', yuzdesi: 25, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslimatta (%50)', yuzdesi: 50, gunSonra: 30 })
  } else if (musteriTipi === 'muteahhit') {
    // Müteahhit: %20 peşin, %30 imalatta, %50 teslim+30gün
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%20)', yuzdesi: 20, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%30)', yuzdesi: 30, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslim + 30 gün (%50)', yuzdesi: 50, gunSonra: 45 })
  } else {
    // Son kullanıcı: %50 peşin, %50 teslimatta
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%50)', yuzdesi: 50, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'Teslimatta (%50)', yuzdesi: 50, gunSonra: 30 })
  }

  return taksitler.map(t => ({
    taksitNo: t.taksitNo,
    aciklama: t.aciklama,
    tutar: Math.round((toplamTutar * t.yuzdesi) / 100 * 100) / 100,
    vadeTarihi: new Date(onayTarihi.getTime() + t.gunSonra * 24 * 60 * 60 * 1000)
  }))
}

// GET: İşe ait ödeme planını getir veya ?vadeler=1 ile yaklaşan taksitler
export async function GET(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { searchParams } = new URL(req.url)

  // Sidebar için: vadesi geçmiş veya 7 gün içinde olan ödenmemiş taksitler
  if (searchParams.get('vadeler') === '1') {
    const simdi = new Date()
    const yediGunSonra = new Date(simdi.getTime() + 7 * 24 * 60 * 60 * 1000)
    const taksitler = await prisma.odemeTaksiti.findMany({
      where: {
        odendiMi: false,
        vadeTarihi: { lte: yediGunSonra },
        plan: { is: { atolyeId } }
      },
      include: {
        plan: {
          include: {
            is: { select: { urunAdi: true, teklifNo: true } },
            musteri: { select: { ad: true, firmaAdi: true } }
          }
        }
      },
      orderBy: { vadeTarihi: 'asc' },
      take: 5
    })
    return NextResponse.json({ taksitler })
  }

  const isId = searchParams.get('isId')
  if (!isId) return NextResponse.json({ hata: 'isId gerekli.' }, { status: 400 })

  const plan = await prisma.odemePlani.findUnique({
    where: { isId },
    include: { taksitler: { orderBy: { taksitNo: 'asc' } } }
  })

  return NextResponse.json({ plan })
}

// POST: İş onaylandığında otomatik ödeme planı oluştur
export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const body = await req.json()
  const { isId } = body

  if (!isId) return NextResponse.json({ hata: 'isId gerekli.' }, { status: 400 })

  const is = await prisma.is.findFirst({
    where: { id: isId, atolyeId: atolyeId },
    include: { musteri: true }
  })
  if (!is) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })
  if (!is.musteriId || !is.musteri) return NextResponse.json({ hata: 'İşe bağlı müşteri yok.' }, { status: 400 })

  // Zaten plan varsa döndür
  const mevcutPlan = await prisma.odemePlani.findUnique({
    where: { isId },
    include: { taksitler: { orderBy: { taksitNo: 'asc' } } }
  })
  if (mevcutPlan) return NextResponse.json({ plan: mevcutPlan, mevcuttu: true })

  const musteriTipi = is.musteri.musteriTipi || 'son_kullanici'
  const toplamTutar = Number(is.satisFiyati)
  const onayTarihi = is.onaylanmaTarihi || new Date()

  const taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, onayTarihi)

  const plan = await prisma.odemePlani.create({
    data: {
      isId,
      musteriId: is.musteriId,
      toplamTutar,
      musteriTipi,
      taksitler: {
        create: taksitVerileri
      }
    },
    include: { taksitler: { orderBy: { taksitNo: 'asc' } } }
  })

  return NextResponse.json({ plan })
}

// PUT: Taksit ödendi işaretle
export async function PUT(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const body = await req.json()
  const { taksitId, odendiMi } = body

  if (!taksitId) return NextResponse.json({ hata: 'taksitId gerekli.' }, { status: 400 })

  const taksit = await prisma.odemeTaksiti.findFirst({
    where: { id: taksitId, plan: { is: { atolyeId: atolyeId } } }
  })
  if (!taksit) return NextResponse.json({ hata: 'Taksit bulunamadı.' }, { status: 404 })

  const data: any = {}
  if (typeof odendiMi === 'boolean') {
    data.odendiMi = odendiMi
    data.odenmeTarihi = odendiMi ? new Date() : null
  }
  if (body.vadeTarihi) data.vadeTarihi = new Date(body.vadeTarihi)
  if (body.aciklama) data.aciklama = body.aciklama
  if (body.tutar !== undefined) data.tutar = Number(body.tutar)

  const guncellenmis = await prisma.odemeTaksiti.update({
    where: { id: taksitId },
    data
  })

  return NextResponse.json({ taksit: guncellenmis })
}

// GET ?vadeler=1 — vadesi geçmiş veya yaklaşan taksitler (sidebar için)
// Mevcut GET fonksiyonuna ek olarak ayrı bir export değil,
// mevcut GET içinde handle edilecek — aşağıya bakın

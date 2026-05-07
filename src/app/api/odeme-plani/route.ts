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

// GET: İşe ait ödeme planını getir
export async function GET(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const { searchParams } = new URL(req.url)
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
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()
  const { isId } = body

  if (!isId) return NextResponse.json({ hata: 'isId gerekli.' }, { status: 400 })

  const is = await prisma.is.findFirst({
    where: { id: isId, atolyeId: atolye.id },
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
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const body = await req.json()
  const { taksitId, odendiMi } = body

  if (!taksitId) return NextResponse.json({ hata: 'taksitId gerekli.' }, { status: 400 })

  const taksit = await prisma.odemeTaksiti.findFirst({
    where: { id: taksitId, plan: { is: { atolyeId: atolye.id } } }
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

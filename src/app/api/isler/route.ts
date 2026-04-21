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

function teklifNoOlustur(sayi: number): string {
  const yil = new Date().getFullYear()
  const no = String(sayi).padStart(4, '0')
  return `TKL-${yil}-${no}`
}

export async function GET() {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ isler: [] })

  const isler = await prisma.is.findMany({
    where: { atolyeId: atolye.id },
    orderBy: { createdAt: 'desc' },
    include: { operasyonlar: true },
  })

  return NextResponse.json({ isler })
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id },
    include: { makineler: true },
  })
  if (!atolye) return NextResponse.json({ hata: 'Önce atölye profili oluşturun.' }, { status: 400 })

  const veri = await req.json()

  const {
    musteriAdi, urunAdi, malzemeTipi, musteriTipi,
    plakaFiyatiEuro, metrajMtul, birMtulDakika,
    tezgahArasiMtul, tezgahArasiDakika,
    adaTezgahMtul, adaTezgahDakika,
    kullanilanKur, karYuzdesi, notlar,
    plakaGenislikCm, plakaUzunlukCm, plakadanAlinanMtul,
    operasyonlar, isTarihi,
  } = veri

  const dakikaMaliyeti = Number(atolye.dakikaMaliyeti) || 0
  const gercekPlakaMtul = parseFloat(plakadanAlinanMtul) || Number(atolye.plakaBasinaMtul) || 3.20
  const kdvOrani = Number(atolye.kdvOrani) || 20
  const teklifGecerlilik = Number(atolye.teklifGecerlilik) || 15

  const toplamMetraj =
    (parseFloat(metrajMtul) || 0) +
    (parseFloat(tezgahArasiMtul) || 0) +
    (parseFloat(adaTezgahMtul) || 0)

  let toplamSureDakika =
    (parseFloat(metrajMtul) || 0) * (parseFloat(birMtulDakika) || 0) +
    (parseFloat(tezgahArasiMtul) || 0) * (parseFloat(tezgahArasiDakika) || 0) +
    (parseFloat(adaTezgahMtul) || 0) * (parseFloat(adaTezgahDakika) || 0)

  for (const op of operasyonlar || []) {
    toplamSureDakika += op.toplamDakika
  }

  const iscilikMaliyeti = toplamSureDakika * dakikaMaliyeti
  const kullanilanPlakaSayisi = toplamMetraj / gercekPlakaMtul
  const malzemeMaliyeti = kullanilanPlakaSayisi * (parseFloat(plakaFiyatiEuro) || 0) * (parseFloat(kullanilanKur) || 0)
  const toplamMaliyet = iscilikMaliyeti + malzemeMaliyeti
  const satisFiyati = toplamMaliyet * (1 + (parseFloat(karYuzdesi) || 0) / 100)
  const kdvTutari = satisFiyati * (kdvOrani / 100)
  const kdvDahilFiyat = satisFiyati + kdvTutari
  const mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0

  const toplamIs = await prisma.is.count({ where: { atolyeId: atolye.id } })
  const teklifNo = teklifNoOlustur(toplamIs + 1)

  const teklifGecerlilikTarihi = new Date()
  teklifGecerlilikTarihi.setDate(teklifGecerlilikTarihi.getDate() + teklifGecerlilik)

  const is = await prisma.is.create({
    data: {
      atolyeId: atolye.id,
      teklifNo,
      musteriAdi,
      urunAdi,
      malzemeTipi,
      musteriTipi,
      plakaFiyatiEuro: parseFloat(plakaFiyatiEuro) || 0,
      metrajMtul: parseFloat(metrajMtul) || 0,
      birMtulDakika: parseFloat(birMtulDakika) || 0,
      tezgahArasiMtul: parseFloat(tezgahArasiMtul) || 0,
      tezgahArasiDakika: parseFloat(tezgahArasiDakika) || 0,
      adaTezgahMtul: parseFloat(adaTezgahMtul) || 0,
      adaTezgahDakika: parseFloat(adaTezgahDakika) || 0,
      kullanilanKur: parseFloat(kullanilanKur) || 0,
      plakaGenislikCm: parseFloat(plakaGenislikCm) || 0,
      plakaUzunlukCm: parseFloat(plakaUzunlukCm) || 0,
      plakadanAlinanMtul: gercekPlakaMtul,
      kullanilanPlakaSayisi,
      karYuzdesi: parseFloat(karYuzdesi) || 0,
      notlar,
      toplamSureDakika,
      iscilikMaliyeti,
      malzemeMaliyeti,
      toplamMaliyet,
      kdvTutari,
      kdvDahilFiyat,
      satisFiyati,
      mtulSatisFiyati,
      teklifGecerlilikTarihi,
      isTarihi: isTarihi ? new Date(isTarihi) : null,
      durum: 'teklif_verildi',
      operasyonlar: {
        create: (operasyonlar || []).map((op: { operasyonTipi: string; makineId?: string; adet: number; birimDakika: number; toplamDakika: number }) => ({
          operasyonTipi: op.operasyonTipi,
          makineId: op.makineId || null,
          adet: op.adet,
          birimDakika: op.birimDakika,
          toplamDakika: op.toplamDakika,
        })),
      },
    },
  })

  const tumIsler = await prisma.is.findMany({
    where: { atolyeId: atolye.id, plakadanAlinanMtul: { gt: 0 } },
    select: { plakadanAlinanMtul: true },
  })

  if (tumIsler.length > 0) {
    const ortalama = tumIsler.reduce((acc, i) => acc + Number(i.plakadanAlinanMtul), 0) / tumIsler.length
    await prisma.atolye.update({
      where: { id: atolye.id },
      data: { plakaBasinaMtul: ortalama },
    })
  }

  return NextResponse.json({
    is, toplamSureDakika, iscilikMaliyeti, malzemeMaliyeti,
    toplamMaliyet, satisFiyati, kdvTutari, kdvDahilFiyat,
    mtulSatisFiyati, toplamMetraj, teklifNo,
    teklifGecerlilikTarihi: teklifGecerlilikTarihi.toISOString()
  })
}

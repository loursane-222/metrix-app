import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



function teklifNoOlustur(sayi: number): string {
  const yil = new Date().getFullYear()
  const no = String(sayi).padStart(4, '0')
  return `TKL-${yil}-${no}`
}

export async function GET(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { searchParams } = new URL(req.url)
  const musteriId = searchParams.get('musteriId')
  const durumFiltre = searchParams.get('durum') // 'onaylandi' gibi

  const where: any = { atolyeId: atolyeId }
  if (musteriId) where.musteriId = musteriId
  if (durumFiltre) where.durum = durumFiltre

  const isler = await prisma.is.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      operasyonlar: true,
      workSchedule: { select: { id: true } },
    },
  })

  const islerWithPlan = isler.map((i: any) => ({
    ...i,
    hasPlan: !!i.workSchedule,
  }))

  return NextResponse.json({ isler: islerWithPlan })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const atolye = await prisma.atolye.findUnique({
    where: { id: atolyeId },
    include: { makineler: true },
  })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const veri = await req.json()

  const {
    musteriId,
    musteriAdi, urunAdi, malzemeTipi, musteriTipi,
    plakaFiyatiEuro, metrajMtul, birMtulDakika,
    tezgahArasiMtul, tezgahArasiDakika,
    adaTezgahMtul, adaTezgahDakika,
    kullanilanKur, karYuzdesi, notlar,
    plakaGenislikCm, plakaUzunlukCm, plakadanAlinanMtul,
    operasyonlar, isTarihi,
    manuelPlakaSayisi,
    plakaFiyatiTl,
    stoneSource,
    selectedStockPlateId,
    stockMaterialSnapshot,
    customerOwnedMaterialNote,

    ozelIscilik1Mtul, ozelIscilik1Dakika,
    ozelIscilik2Mtul, ozelIscilik2Dakika,
    ozelIscilik3Mtul, ozelIscilik3Dakika,
  } = veri

  const normalizedStoneSource = ["STOCK", "PURCHASE", "CUSTOMER_OWNED"].includes(String(stoneSource || ""))
    ? String(stoneSource)
    : null

  let bagliMusteriId: string | null = null
  let yeniMusteriOlusturuldu = false

  if (musteriId) {
    const mevcutMusteri = await prisma.musteri.findFirst({
      where: {
        id: musteriId,
        atolyeId: atolyeId
      }
    })
    if (mevcutMusteri) {
      bagliMusteriId = mevcutMusteri.id
    }
  }

  if (!bagliMusteriId && String(musteriAdi || '').trim()) {
    const aranan = String(musteriAdi || '').trim()

    let mevcutMusteri = await prisma.musteri.findFirst({
      where: {
        atolyeId: atolyeId,
        OR: [
          { firmaAdi: aranan },
          { ad: aranan }
        ]
      }
    })

    if (!mevcutMusteri) {
      mevcutMusteri = await prisma.musteri.create({
        data: {
          atolyeId: atolyeId,
          firmaAdi: '',
          ad: aranan,
          soyad: '',
          telefon: '',
          email: ''
        }
      })
      yeniMusteriOlusturuldu = true
    }

    bagliMusteriId = mevcutMusteri.id
  }

  const dakikaMaliyeti = Number(atolye.dakikaMaliyeti) || 0
  const gercekPlakaMtul = normalizeMtulInput(plakadanAlinanMtul) || normalizeMtulInput(atolye.plakaBasinaMtul) || 3.20
  const kdvOrani = Number(atolye.kdvOrani) || 20
  const teklifGecerlilik = Number(atolye.teklifGecerlilik) || 15

  const normalTezgahMtul = normalizeMtulInput(metrajMtul) || 0
  const normalTezgahArasiMtul = normalizeMtulInput(tezgahArasiMtul) || 0
  const normalAdaTezgahMtul = normalizeMtulInput(adaTezgahMtul) || 0

  const ozel1Mtul = normalizeMtulInput(ozelIscilik1Mtul) || 0
  const ozel2Mtul = normalizeMtulInput(ozelIscilik2Mtul) || 0
  const ozel3Mtul = normalizeMtulInput(ozelIscilik3Mtul) || 0

  const toplamMetraj =
    normalTezgahMtul +
    normalTezgahArasiMtul +
    normalAdaTezgahMtul +
    ozel1Mtul +
    ozel2Mtul +
    ozel3Mtul

  const temelSureDakika =
    normalTezgahMtul * (normalizeMtulInput(birMtulDakika) || 0) +
    normalTezgahArasiMtul * (parseFloat(tezgahArasiDakika) || 0) +
    normalAdaTezgahMtul * (parseFloat(adaTezgahDakika) || 0) +
    ozel1Mtul * (parseFloat(ozelIscilik1Dakika) || 0) +
    ozel2Mtul * (parseFloat(ozelIscilik2Dakika) || 0) +
    ozel3Mtul * (parseFloat(ozelIscilik3Dakika) || 0)

  let operasyonSureDakika = 0
  let operasyonMaliyeti = 0

  for (const op of operasyonlar || []) {
    const opDakika = Number(op.toplamDakika) || 0
    operasyonSureDakika += opDakika

    let opDakikalikMaliyet = dakikaMaliyeti

    if (op.makineId) {
      const makine = atolye.makineler.find((m) => m.id === op.makineId)
      if (makine) {
        opDakikalikMaliyet = Number(makine.dakikalikMaliyet) || dakikaMaliyeti
      }
    }

    operasyonMaliyeti += opDakika * opDakikalikMaliyet
  }

  const toplamSureDakika = temelSureDakika + operasyonSureDakika
  const iscilikMaliyeti = (temelSureDakika * dakikaMaliyeti) + operasyonMaliyeti

  const layoutPlakaSayisi = Number((veri as any)?.plakaLayoutJson?.plakaSayisi || 0)

  const otomatikPlakaSayisi =
    layoutPlakaSayisi > 0
      ? layoutPlakaSayisi
      : gercekPlakaMtul > 0
      ? Math.ceil(toplamMetraj / gercekPlakaMtul)
      : 0

  const kullanilanPlakaSayisi =
    Number(manuelPlakaSayisi) > 0 ? Number(manuelPlakaSayisi) : otomatikPlakaSayisi

  const plakaFiyatiTlHesap = parseFloat(plakaFiyatiTl) > 0
    ? parseFloat(plakaFiyatiTl)
    : (parseFloat(plakaFiyatiEuro) || 0) * (parseFloat(kullanilanKur) || 0)

  const malzemeMaliyeti =
    normalizedStoneSource === "CUSTOMER_OWNED" ? 0 : kullanilanPlakaSayisi * plakaFiyatiTlHesap

  const toplamMaliyet = iscilikMaliyeti + malzemeMaliyeti
  const satisFiyati = toplamMaliyet * (1 + (parseFloat(karYuzdesi) || 0) / 100)
  const kdvTutari = satisFiyati * (kdvOrani / 100)
  const kdvDahilFiyat = satisFiyati + kdvTutari
  const mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0

  const toplamIs = await prisma.is.count({ where: { atolyeId: atolyeId } })
  const teklifNo = teklifNoOlustur(toplamIs + 1)

  const teklifGecerlilikTarihi = new Date()
  teklifGecerlilikTarihi.setDate(teklifGecerlilikTarihi.getDate() + teklifGecerlilik)

  let safeSelectedStockPlateId: string | null = null
  if (normalizedStoneSource === "STOCK" && selectedStockPlateId) {
    const plate = await prisma.stockPlate.findFirst({
      where: { id: String(selectedStockPlateId), atolyeId },
      select: { id: true },
    })
    safeSelectedStockPlateId = plate?.id || null
  }

  const safeStockMaterialSnapshot =
    normalizedStoneSource === "STOCK" && stockMaterialSnapshot && typeof stockMaterialSnapshot === "object"
      ? stockMaterialSnapshot
      : undefined

  const legacyTasDurumu =
    normalizedStoneSource === "STOCK"
      ? "stokta"
      : normalizedStoneSource === "PURCHASE"
      ? "alinacak"
      : normalizedStoneSource === "CUSTOMER_OWNED"
      ? "stokta"
      : (veri as any).tasDurumu || null

  const is = await prisma.is.create({
    data: {
      plakaLayoutJson: (veri as any).plakaLayoutJson || null,
      plakaImageUrl: (veri as any).plakaImageUrl || null,
      atolyeId: atolyeId,
      musteriId: bagliMusteriId,
      teklifNo,
      musteriAdi,
      urunAdi,
      malzemeTipi,
      musteriTipi,
      plakaFiyatiEuro: parseFloat(plakaFiyatiEuro) || 0,
      metrajMtul: normalTezgahMtul,
      birMtulDakika: normalizeMtulInput(birMtulDakika) || 0,
      tezgahArasiMtul: normalTezgahArasiMtul,
      tezgahArasiDakika: parseFloat(tezgahArasiDakika) || 0,
      adaTezgahMtul: normalAdaTezgahMtul,
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
      tasDurumu: legacyTasDurumu,
      stoneSource: normalizedStoneSource,
      selectedStockPlateId: safeSelectedStockPlateId,
      stockMaterialSnapshot: safeStockMaterialSnapshot,
      customerOwnedMaterialNote: normalizedStoneSource === "CUSTOMER_OWNED" ? String(customerOwnedMaterialNote || "").trim() || null : null,
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
    where: { atolyeId: atolyeId, plakadanAlinanMtul: { gt: 0 } },
    select: { plakadanAlinanMtul: true },
  })

  if (tumIsler.length > 0) {
    const ortalama = tumIsler.reduce((acc, i) => acc + normalizeMtulInput(i.plakadanAlinanMtul), 0) / tumIsler.length
    await prisma.atolye.update({
      where: { id: atolyeId },
      data: { plakaBasinaMtul: ortalama },
    })
  }

  try {
    const { logActivity } = await import('@/lib/activityLogger')
    await logActivity({
      atolyeId: atolyeId,
      type: 'teklif_olusturuldu',
      message: musteriAdi + ' icin ' + teklifNo + ' numarali teklif olusturuldu. Tutar: ' + satisFiyati.toLocaleString('tr-TR') + ' TL',
      refId: is.id,
      userId: auth.userId,
      personelId: auth.personelId || undefined,
    })
  } catch {}

  return NextResponse.json({
    is, toplamSureDakika, iscilikMaliyeti, malzemeMaliyeti,
    toplamMaliyet, satisFiyati, kdvTutari, kdvDahilFiyat,
    mtulSatisFiyati, toplamMetraj, kullanilanPlakaSayisi, teklifNo,
    teklifGecerlilikTarihi: teklifGecerlilikTarihi.toISOString(),
    yeniMusteriOlusturuldu: typeof yeniMusteriOlusturuldu !== 'undefined' ? yeniMusteriOlusturuldu : false,
    musteriId: bagliMusteriId || null
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'id gerekli.' }, { status: 400 })
  const is = await prisma.is.findFirst({ where: { id, atolyeId } })
  if (!is) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })
  await prisma.is.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

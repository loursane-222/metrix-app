import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import {
  isStockReservationReleaseBlocked,
  releaseOpenReservationsForJob,
  syncJobStockDraftReservation,
} from "@/lib/stock/reservations";
import { notifyProposalApproved } from "@/lib/proposalNotifications";



async function atolyeAl(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { atolye: true } })
  return user?.atolye || null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const atolye = await atolyeAl(auth.userId)
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı' }, { status: 404 })
  const { id } = await params
  const is = await prisma.is.findFirst({
    where: { id, atolyeId: atolyeId },
    include: { operasyonlar: true, musteri: { select: { telefon: true } } }
  })
  if (!is) return NextResponse.json({ hata: 'İş bulunamadı' }, { status: 404 })
  return NextResponse.json({ is: { ...is, musteriTelefonu: is.musteri?.telefon || "" } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const atolye = await atolyeAl(auth.userId)
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı' }, { status: 404 })
  const { id } = await params

  const mevcutIs = await prisma.is.findFirst({ where: { id, atolyeId: atolyeId } })
  if (!mevcutIs) return NextResponse.json({ hata: 'İş bulunamadı' }, { status: 404 })

  const body = await req.json()
  const onaylandi = body.onaylandi === true
  const normalizedStoneSource = ["STOCK", "PURCHASE", "CUSTOMER_OWNED"].includes(String(body.stoneSource || ""))
    ? String(body.stoneSource)
    : null

  let bagliMusteriId = mevcutIs.musteriId || null

  if (body.musteriId) {
    const mevcutMusteri = await prisma.musteri.findFirst({
      where: {
        id: body.musteriId,
        atolyeId: atolyeId
      }
    })
    if (mevcutMusteri) {
      bagliMusteriId = mevcutMusteri.id
    }
  }

  const normalTezgahMtul = normalizeMtulInput(body.metrajMtul || 0)
  const normalTezgahArasiMtul = normalizeMtulInput(body.tezgahArasiMtul || 0)
  const normalAdaTezgahMtul = normalizeMtulInput(body.adaTezgahMtul || 0)

  const ozel1Mtul = normalizeMtulInput(body.ozelIscilik1Mtul || 0)
  const ozel2Mtul = normalizeMtulInput(body.ozelIscilik2Mtul || 0)
  const ozel3Mtul = normalizeMtulInput(body.ozelIscilik3Mtul || 0)

  const toplamMetraj =
    normalTezgahMtul +
    normalTezgahArasiMtul +
    normalAdaTezgahMtul +
    ozel1Mtul +
    ozel2Mtul +
    ozel3Mtul

  const otomatikPlakaSayisi =
    body.plakadanAlinanMtul > 0
      ? Math.ceil(toplamMetraj / body.plakadanAlinanMtul)
      : 0

  const ekPlaka = (body.kirilanTasPlaka || 0) + (body.hataliKesimPlaka || 0)

  const toplamPlakaSayisi =
    Number(body.manuelPlakaSayisi) > 0
      ? Number(body.manuelPlakaSayisi)
      : (otomatikPlakaSayisi + ekPlaka)

  const malzemeMaliyeti =
    normalizedStoneSource === "CUSTOMER_OWNED" ? 0 : toplamPlakaSayisi * body.plakaFiyatiEuro * body.kullanilanKur

  const toplamSureDakika =
    normalTezgahMtul * normalizeMtulInput(body.birMtulDakika || 0) +
    normalTezgahArasiMtul * Number(body.tezgahArasiDakika || 0) +
    normalAdaTezgahMtul * Number(body.adaTezgahDakika || 0) +
    ozel1Mtul * Number(body.ozelIscilik1Dakika || 0) +
    ozel2Mtul * Number(body.ozelIscilik2Dakika || 0) +
    ozel3Mtul * Number(body.ozelIscilik3Dakika || 0) +
    (body.operasyonlar || []).reduce((acc: number, op: any) => acc + (op.toplamDakika || 0), 0)

  const iscilikMaliyeti = toplamSureDakika * Number(atolye.dakikaMaliyeti)
  const operasyonelFireMaliyeti = Number(mevcutIs.operasyonelFireMaliyeti || 0)
  const fiyatMaliyetTabani = malzemeMaliyeti + iscilikMaliyeti
  const toplamMaliyet = fiyatMaliyetTabani + operasyonelFireMaliyeti

  let satisFiyati = Number(mevcutIs.satisFiyati)
  let kdvTutari = Number(mevcutIs.kdvTutari)
  let kdvDahilFiyat = Number(mevcutIs.kdvDahilFiyat)
  let mtulSatisFiyati = normalizeMtulInput(mevcutIs.mtulSatisFiyati)

  if (!onaylandi) {
    satisFiyati = fiyatMaliyetTabani * (1 + (body.karYuzdesi || 0) / 100)
    kdvTutari = satisFiyati * (Number(atolye.kdvOrani) / 100)
    kdvDahilFiyat = satisFiyati + kdvTutari
    mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0
  }

  let safeSelectedStockPlateId: string | null = null
  if (normalizedStoneSource === "STOCK" && body.selectedStockPlateId) {
    const plate = await prisma.stockPlate.findFirst({
      where: { id: String(body.selectedStockPlateId), atolyeId },
      select: { id: true },
    })
    safeSelectedStockPlateId = plate?.id || null
  }

  const safeStockMaterialSnapshot =
    normalizedStoneSource === "STOCK" && body.stockMaterialSnapshot && typeof body.stockMaterialSnapshot === "object"
      ? body.stockMaterialSnapshot
      : undefined

  const legacyTasDurumu =
    normalizedStoneSource === "STOCK"
      ? "stokta"
      : normalizedStoneSource === "PURCHASE"
      ? "alinacak"
      : normalizedStoneSource === "CUSTOMER_OWNED"
      ? "stokta"
      : body.tasDurumu || mevcutIs.tasDurumu

  try {
    await prisma.$transaction(async (tx) => {
      await tx.isOperasyon.deleteMany({ where: { isId: id } })

    await tx.is.update({
      where: { id },
      data: {
        musteriId: bagliMusteriId,
        musteriAdi: body.musteriAdi,
        urunAdi: body.urunAdi,
        malzemeTipi: body.malzemeTipi,
        musteriTipi: body.musteriTipi,
        plakaFiyatiEuro: body.plakaFiyatiEuro,
        metrajMtul: normalTezgahMtul,
        birMtulDakika: body.birMtulDakika,
        tezgahArasiMtul: normalTezgahArasiMtul,
        tezgahArasiDakika: body.tezgahArasiDakika || 0,
        adaTezgahMtul: normalAdaTezgahMtul,
        adaTezgahDakika: body.adaTezgahDakika || 0,
        kullanilanKur: body.kullanilanKur,
        karYuzdesi: body.karYuzdesi,
        plakaGenislikCm: body.plakaGenislikCm || 0,
        plakaUzunlukCm: body.plakaUzunlukCm || 0,
        plakadanAlinanMtul: body.plakadanAlinanMtul || 0,
        kullanilanPlakaSayisi: toplamPlakaSayisi,
        kirilanTasPlaka: body.kirilanTasPlaka || 0,
        hataliKesimPlaka: body.hataliKesimPlaka || 0,
        toplamSureDakika,
        iscilikMaliyeti,
        malzemeMaliyeti,
        toplamMaliyet,
        satisFiyati,
        kdvTutari,
        kdvDahilFiyat,
        mtulSatisFiyati,
        notlar: body.notlar,
        tasDurumu: legacyTasDurumu,
        stoneSource: normalizedStoneSource,
        selectedStockPlateId: safeSelectedStockPlateId,
        stockMaterialSnapshot: safeStockMaterialSnapshot,
        customerOwnedMaterialNote: normalizedStoneSource === "CUSTOMER_OWNED" ? String(body.customerOwnedMaterialNote || "").trim() || null : null,
        operasyonlar: {
          create: (body.operasyonlar || []).map((op: any) => ({
            operasyonTipi: op.operasyonTipi,
            makineId: op.makineId || null,
            adet: op.adet,
            birimDakika: op.birimDakika,
            toplamDakika: op.toplamDakika,
          }))
        }
      }
    })

    await syncJobStockDraftReservation(tx, {
      atolyeId,
      isId: id,
      stockPlateId: safeSelectedStockPlateId,
    })
  })

    return NextResponse.json({
      teklifNo: mevcutIs.teklifNo,
      toplamMetraj,
      toplamSureDakika,
      iscilikMaliyeti,
      malzemeMaliyeti,
      toplamMaliyet,
      satisFiyati,
      mtulSatisFiyati,
      kdvTutari,
      kdvDahilFiyat,
      kullanilanPlakaSayisi: toplamPlakaSayisi,
      teklifGecerlilikTarihi: mevcutIs.teklifGecerlilikTarihi,
    })
  } catch (e: any) {
    if (isStockReservationReleaseBlocked(e)) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    return NextResponse.json({ error: e.message || "İş güncellenemedi" }, { status: 500 })
  }
}

function odemePlanOlustur(musteriTipi: string, toplamTutar: number, onayTarihi: Date) {
  const taksitler: { taksitNo: number; aciklama: string; yuzdesi: number; gunSonra: number }[] = []
  if (musteriTipi === 'bayi') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%30)', yuzdesi: 30, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'Teslimatta (%70)', yuzdesi: 70, gunSonra: 30 })
  } else if (musteriTipi === 'mimar') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%25)', yuzdesi: 25, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%25)', yuzdesi: 25, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslimatta (%50)', yuzdesi: 50, gunSonra: 30 })
  } else if (musteriTipi === 'muteahhit') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%20)', yuzdesi: 20, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%30)', yuzdesi: 30, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslim + 30 gün (%50)', yuzdesi: 50, gunSonra: 45 })
  } else {
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { durum, sablonId } = body

    if (!id || !durum) return NextResponse.json({ error: 'id ve durum gerekli' }, { status: 400 })

    const previous = await prisma.is.findUnique({ where: { id } })
    if (!previous) return NextResponse.json({ error: 'İş bulunamadı' }, { status: 404 })

    const data: any = { durum }

    if (durum === 'onaylandi') {
      data.onaylanmaTarihi = new Date()
      data.kaybedilmeTarihi = null
    } else if (durum === 'kaybedildi') {
      data.kaybedilmeTarihi = new Date()
      data.onaylanmaTarihi = null
    } else if (durum === 'teklif_verildi') {
      data.onaylanmaTarihi = null
      data.kaybedilmeTarihi = null
    }

    const updated = await prisma.$transaction(async (tx) => {
      const job = await tx.is.update({
        where: { id },
        data,
        include: { musteri: true }
      })

      if (durum === 'kaybedildi') {
        await releaseOpenReservationsForJob(tx, { atolyeId: job.atolyeId, isId: id })
      }

      return job
    })

    if (durum === 'onaylandi' && previous.durum !== 'onaylandi') {
      await notifyProposalApproved({
        job: {
          id: updated.id,
          atolyeId: updated.atolyeId,
          teklifNo: updated.teklifNo,
          musteriId: updated.musteriId,
          musteriAdi: updated.musteriAdi || updated.musteri?.firmaAdi,
          satisFiyati: updated.satisFiyati,
          kdvDahilFiyat: updated.kdvDahilFiyat,
        },
        source: 'admin-proposal',
      })
    }

    // Onaylandığında otomatik ödeme planı oluştur
    if (durum === 'onaylandi' && updated.musteriId && updated.musteri) {
      const mevcutPlan = await prisma.odemePlani.findUnique({ where: { isId: id } })
      if (!mevcutPlan) {
        const musteriTipi = updated.musteri.musteriTipi || 'son_kullanici'
        const toplamTutar = Number(updated.satisFiyati || 0)
        if (toplamTutar > 0) {
          let taksitVerileri: any[]
          if (sablonId && !sablonId.startsWith('default_')) {
            const sablon = await prisma.odemeSablonu.findUnique({ where: { id: sablonId } })
            if (sablon) {
              const taksitler = sablon.taksitler as { taksitNo: number; aciklama: string; yuzde: number; gunSonra: number }[]
              taksitVerileri = taksitler.map(t => ({
                taksitNo: t.taksitNo, aciklama: t.aciklama,
                tutar: Math.round((toplamTutar * t.yuzde) / 100 * 100) / 100,
                vadeTarihi: new Date(Date.now() + t.gunSonra * 24 * 60 * 60 * 1000),
              }))
            } else {
              taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, new Date())
            }
          } else if (sablonId && sablonId.startsWith('default_')) {
            const VARSAYILAN: Record<string, any[]> = {
              bayi: [{taksitNo:1,aciklama:"Peşinat",yuzde:30,gunSonra:0},{taksitNo:2,aciklama:"Teslimatta",yuzde:70,gunSonra:30}],
              mimar: [{taksitNo:1,aciklama:"Peşinat",yuzde:25,gunSonra:0},{taksitNo:2,aciklama:"İmalat Başlangıcı",yuzde:25,gunSonra:15},{taksitNo:3,aciklama:"Teslimatta",yuzde:50,gunSonra:30}],
              muteahhit: [{taksitNo:1,aciklama:"Peşinat",yuzde:20,gunSonra:0},{taksitNo:2,aciklama:"İmalat Başlangıcı",yuzde:30,gunSonra:15},{taksitNo:3,aciklama:"Hak Ediş",yuzde:50,gunSonra:45}],
              son_kullanici: [{taksitNo:1,aciklama:"Peşinat",yuzde:50,gunSonra:0},{taksitNo:2,aciklama:"Teslimatta",yuzde:50,gunSonra:30}],
              imalatci: [{taksitNo:1,aciklama:"Peşinat",yuzde:30,gunSonra:0},{taksitNo:2,aciklama:"İş Bitiminde",yuzde:70,gunSonra:30}],
            }
            const parts = sablonId.replace('default_','').split('_')
            const tip = parts.slice(0, parts.length-1).join('_')
            const grup = VARSAYILAN[tip] || VARSAYILAN['son_kullanici']
            taksitVerileri = grup.map((t: any) => ({
              taksitNo: t.taksitNo, aciklama: t.aciklama,
              tutar: Math.round((toplamTutar * t.yuzde) / 100 * 100) / 100,
              vadeTarihi: new Date(Date.now() + t.gunSonra * 24 * 60 * 60 * 1000),
            }))
          } else {
            taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, new Date())
          }
          await prisma.odemePlani.create({
            data: { isId: id, musteriId: updated.musteriId, toplamTutar, musteriTipi, taksitler: { create: taksitVerileri } }
          })
        }
      }
    }

    return NextResponse.json({ ok: true, data: updated })
  } catch (e: any) {
    if (isStockReservationReleaseBlocked(e)) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

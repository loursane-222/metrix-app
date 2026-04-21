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
  } catch { return null }
}

async function atolyeAl(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { atolye: true } })
  return user?.atolye || null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 })
  const atolye = await atolyeAl(kullanici.id)
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı' }, { status: 404 })
  const { id } = await params
  const is = await prisma.is.findFirst({
    where: { id, atolyeId: atolye.id },
    include: { operasyonlar: true }
  })
  if (!is) return NextResponse.json({ hata: 'İş bulunamadı' }, { status: 404 })
  return NextResponse.json({ is })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 })
  const atolye = await atolyeAl(kullanici.id)
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı' }, { status: 404 })
  const { id } = await params

  const mevcutIs = await prisma.is.findFirst({ where: { id, atolyeId: atolye.id } })
  if (!mevcutIs) return NextResponse.json({ hata: 'İş bulunamadı' }, { status: 404 })

  const body = await req.json()
  const onaylandi = body.onaylandi === true

  const toplamMetraj = (body.metrajMtul||0) + (body.tezgahArasiMtul||0) + (body.adaTezgahMtul||0)
  const normalPlakaSayisi = body.plakadanAlinanMtul > 0 ? toplamMetraj / body.plakadanAlinanMtul : 0
  const ekPlaka = (body.kirilanTasPlaka||0) + (body.hataliKesimPlaka||0)
  const toplamPlakaSayisi = normalPlakaSayisi + ekPlaka
  const malzemeMaliyeti = toplamPlakaSayisi * body.plakaFiyatiEuro * body.kullanilanKur

  const toplamSureDakika =
    (body.metrajMtul||0) * (body.birMtulDakika||0) +
    (body.tezgahArasiMtul||0) * (body.tezgahArasiDakika||0) +
    (body.adaTezgahMtul||0) * (body.adaTezgahDakika||0) +
    (body.operasyonlar||[]).reduce((acc: number, op: any) => acc + (op.toplamDakika||0), 0)

  const iscilikMaliyeti = toplamSureDakika * Number(atolye.dakikaMaliyeti)
  const toplamMaliyet = malzemeMaliyeti + iscilikMaliyeti

  let satisFiyati = Number(mevcutIs.satisFiyati)
  let kdvTutari = Number(mevcutIs.kdvTutari)
  let kdvDahilFiyat = Number(mevcutIs.kdvDahilFiyat)
  let mtulSatisFiyati = Number(mevcutIs.mtulSatisFiyati)

  if (!onaylandi) {
    satisFiyati = toplamMaliyet * (1 + (body.karYuzdesi||0) / 100)
    kdvTutari = satisFiyati * (Number(atolye.kdvOrani) / 100)
    kdvDahilFiyat = satisFiyati + kdvTutari
    mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0
  }

  await prisma.isOperasyon.deleteMany({ where: { isId: id } })

  await prisma.is.update({
    where: { id },
    data: {
      musteriAdi: body.musteriAdi,
      urunAdi: body.urunAdi,
      malzemeTipi: body.malzemeTipi,
      musteriTipi: body.musteriTipi,
      plakaFiyatiEuro: body.plakaFiyatiEuro,
      metrajMtul: body.metrajMtul,
      birMtulDakika: body.birMtulDakika,
      tezgahArasiMtul: body.tezgahArasiMtul||0,
      tezgahArasiDakika: body.tezgahArasiDakika||0,
      adaTezgahMtul: body.adaTezgahMtul||0,
      adaTezgahDakika: body.adaTezgahDakika||0,
      kullanilanKur: body.kullanilanKur,
      karYuzdesi: body.karYuzdesi,
      plakaGenislikCm: body.plakaGenislikCm||0,
      plakaUzunlukCm: body.plakaUzunlukCm||0,
      plakadanAlinanMtul: body.plakadanAlinanMtul||0,
      kullanilanPlakaSayisi: toplamPlakaSayisi,
      kirilanTasPlaka: body.kirilanTasPlaka||0,
      hataliKesimPlaka: body.hataliKesimPlaka||0,
      toplamSureDakika,
      iscilikMaliyeti,
      malzemeMaliyeti,
      toplamMaliyet,
      satisFiyati,
      kdvTutari,
      kdvDahilFiyat,
      mtulSatisFiyati,
      notlar: body.notlar,
      operasyonlar: {
        create: (body.operasyonlar||[]).map((op: any) => ({
          operasyonTipi: op.operasyonTipi,
          makineId: op.makineId||null,
          adet: op.adet,
          birimDakika: op.birimDakika,
          toplamDakika: op.toplamDakika,
        }))
      }
    }
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
    teklifGecerlilikTarihi: mevcutIs.teklifGecerlilikTarihi,
  })
}

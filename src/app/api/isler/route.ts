import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'gizli-anahtar')

async function atolyeIdAl(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      include: { atolye: true }
    })
    return user?.atolye?.id || null
  } catch { return null }
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  if (q.length >= 2) {
    const atolyeId = await atolyeIdAl(request)
    if (!atolyeId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
    const isler = await prisma.is.findMany({
      where: {
        atolyeId,
        OR: [
          { teklifNo: { contains: q, mode: 'insensitive' } },
          { musteriAdi: { contains: q, mode: 'insensitive' } },
          { urunAdi: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, teklifNo: true, musteriAdi: true, urunAdi: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(isler)
  }

  const atolyeId = await atolyeIdAl(request)
  if (!atolyeId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
  const isler = await prisma.is.findMany({
    where: { atolyeId },
    orderBy: { createdAt: 'desc' }
  })
  return NextResponse.json({ isler })
}

export async function POST(request: NextRequest) {
  const atolyeId = await atolyeIdAl(request)
  if (!atolyeId) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { id: atolyeId } })
  if (!atolye) return NextResponse.json({ error: 'Atölye bulunamadı' }, { status: 404 })

  const body = await request.json()

  const toplamMetraj = (body.metrajMtul || 0) + (body.tezgahArasiMtul || 0) + (body.adaTezgahMtul || 0)
  const kullanilanPlakaSayisi = body.plakadanAlinanMtul > 0 ? toplamMetraj / body.plakadanAlinanMtul : 0
  const malzemeMaliyeti = kullanilanPlakaSayisi * body.plakaFiyatiEuro * body.kullanilanKur

  const toplamSureDakika =
    (body.metrajMtul || 0) * (body.birMtulDakika || 0) +
    (body.tezgahArasiMtul || 0) * (body.tezgahArasiDakika || 0) +
    (body.adaTezgahMtul || 0) * (body.adaTezgahDakika || 0) +
    (body.operasyonlar || []).reduce((acc: number, op: any) => acc + (op.toplamDakika || 0), 0)

  const iscilikMaliyeti = toplamSureDakika * Number(atolye.dakikaMaliyeti)
  const toplamMaliyet = malzemeMaliyeti + iscilikMaliyeti
  const satisFiyati = toplamMaliyet * (1 + (body.karYuzdesi || 0) / 100)
  const kdvTutari = satisFiyati * (Number(atolye.kdvOrani) / 100)
  const kdvDahilFiyat = satisFiyati + kdvTutari
  const mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0

  const yil = new Date().getFullYear()
  const ay = String(new Date().getMonth() + 1).padStart(2, '0')
  const adet = await prisma.is.count({ where: { atolyeId } })
  const teklifNo = `TKL-${yil}-${ay}-${String(adet + 1).padStart(4, '0')}`

  const teklifGecerlilikTarihi = new Date()
  teklifGecerlilikTarihi.setDate(teklifGecerlilikTarihi.getDate() + (atolye.teklifGecerlilik || 15))

  const yeniIs = await prisma.is.create({
    data: {
      atolyeId,
      teklifNo,
      musteriAdi: body.musteriAdi,
      urunAdi: body.urunAdi,
      malzemeTipi: body.malzemeTipi,
      musteriTipi: body.musteriTipi,
      plakaFiyatiEuro: body.plakaFiyatiEuro,
      metrajMtul: body.metrajMtul,
      birMtulDakika: body.birMtulDakika,
      tezgahArasiMtul: body.tezgahArasiMtul || 0,
      tezgahArasiDakika: body.tezgahArasiDakika || 0,
      adaTezgahMtul: body.adaTezgahMtul || 0,
      adaTezgahDakika: body.adaTezgahDakika || 0,
      kullanilanKur: body.kullanilanKur,
      karYuzdesi: body.karYuzdesi,
      plakaGenislikCm: body.plakaGenislikCm || 0,
      plakaUzunlukCm: body.plakaUzunlukCm || 0,
      plakadanAlinanMtul: body.plakadanAlinanMtul || 0,
      kullanilanPlakaSayisi,
      toplamSureDakika,
      iscilikMaliyeti,
      malzemeMaliyeti,
      toplamMaliyet,
      kdvTutari,
      kdvDahilFiyat,
      satisFiyati,
      mtulSatisFiyati,
      teklifGecerlilikTarihi,
      notlar: body.notlar,
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

  return NextResponse.json({
    teklifNo,
    toplamMetraj,
    toplamSureDakika,
    iscilikMaliyeti,
    malzemeMaliyeti,
    toplamMaliyet,
    satisFiyati,
    mtulSatisFiyati,
    kdvTutari,
    kdvDahilFiyat,
    teklifGecerlilikTarihi,
  })
}

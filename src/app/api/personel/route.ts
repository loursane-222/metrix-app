import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const prisma = new PrismaClient()

async function atolyeIdAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    })
    return user?.atolye?.id || null
  } catch { return null }
}

export async function GET() {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const personeller = await prisma.personel.findMany({
    where: { atolyeId, aktif: true },
    orderBy: [{ calismaYili: 'desc' }, { ad: 'asc' }],
    include: {
      bagliOldugu: { select: { id: true, ad: true, soyad: true } },
      fazAtamalar: {
        include: {
          schedulePhase: {
            select: {
              isCompleted: true,
              completedAt: true,
              plannedEnd: true,
              phase: true,
            }
          }
        }
      }
    }
  })

  // Performans hesapla
  const personellerPerformans = personeller.map(p => {
    const atamalar = p.fazAtamalar
    const toplamGorev = atamalar.length
    if (toplamGorev === 0) return { ...p, performansNotu: null, toplamGorev: 0, zamanindaTamamlanan: 0 }

    const tamamlanan = atamalar.filter(a => a.schedulePhase.isCompleted)
    const zamanindaTamamlanan = tamamlanan.filter(a => {
      if (!a.schedulePhase.completedAt || !a.schedulePhase.plannedEnd) return true
      return new Date(a.schedulePhase.completedAt) <= new Date(a.schedulePhase.plannedEnd)
    })

    // Performans: %70 tamamlama oranı + %30 zamanında tamamlama oranı
    const tamamlamaOrani = toplamGorev > 0 ? (tamamlanan.length / toplamGorev) : 0
    const zamanindaOrani = tamamlanan.length > 0 ? (zamanindaTamamlanan.length / tamamlanan.length) : 0
    const performansNotu = Math.round((tamamlamaOrani * 70) + (zamanindaOrani * 30))

    return {
      ...p,
      performansNotu,
      toplamGorev,
      tamamlananGorev: tamamlanan.length,
      zamanindaTamamlanan: zamanindaTamamlanan.length,
    }
  })

  return NextResponse.json({ personeller: personellerPerformans })
}

export async function POST(req: NextRequest) {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  // 50 kişi limiti
  const mevcut = await prisma.personel.count({ where: { atolyeId } })
  if (mevcut >= 50) return NextResponse.json({ hata: 'Maksimum 50 personel eklenebilir.' }, { status: 400 })

  const veri = await req.json()
  const personel = await prisma.personel.create({
    data: {
      atolyeId,
      ad: veri.ad,
      soyad: veri.soyad,
      gorevi: veri.gorevi,
      bagliOlduguId: veri.bagliOlduguId || null,
      calismaYili: parseInt(veri.calismaYili) || 0,
      telefon: veri.telefon || '',
      email: veri.email || '',
    }
  })
  return NextResponse.json({ personel })
}

export async function PUT(req: NextRequest) {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const veri = await req.json()
  const personel = await prisma.personel.update({
    where: { id: veri.id },
    data: {
      ad: veri.ad,
      soyad: veri.soyad,
      gorevi: veri.gorevi,
      bagliOlduguId: veri.bagliOlduguId || null,
      calismaYili: parseInt(veri.calismaYili) || 0,
      telefon: veri.telefon || '',
      email: veri.email || '',
      aktif: veri.aktif ?? true,
    }
  })
  return NextResponse.json({ personel })
}

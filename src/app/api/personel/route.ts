import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

async function atolyeIdAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value

  if (!token) return null

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024'
    )

    const { payload } = await jwtVerify(token, secret)

    if ((payload as any).role === 'personel') {
      return (payload as any).atolyeId || null
    }

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    })

    return user?.atolye?.id || null
  } catch (error) {
    console.error('PERSONEL API - TOKEN HATASI:', error)
    return null
  }
}

export async function GET() {
  try {
    const atolyeId = await atolyeIdAl()

    if (!atolyeId) {
      return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    }

    const personeller = await prisma.personel.findMany({
      where: { atolyeId, aktif: true },
      orderBy: [{ calismaYili: 'desc' }, { ad: 'asc' }],
      include: {
        bagliOldugu: {
          select: { id: true, ad: true, soyad: true },
        },
        fazAtamalar: {
          include: {
            schedulePhase: {
              select: {
                isCompleted: true,
                completedAt: true,
                plannedEnd: true,
                phase: true,
              },
            },
          },
        },
      },
    })

    const personellerPerformans = personeller.map((p) => {
      const atamalar = p.fazAtamalar
      const toplamGorev = atamalar.length

      if (toplamGorev === 0) {
        return {
          ...p,
          password: undefined,
          performansNotu: null,
          toplamGorev: 0,
          tamamlananGorev: 0,
          zamanindaTamamlanan: 0,
        }
      }

      const tamamlanan = atamalar.filter((a) => a.schedulePhase.isCompleted)

      const zamanindaTamamlanan = tamamlanan.filter((a) => {
        if (!a.schedulePhase.completedAt || !a.schedulePhase.plannedEnd) return true
        return new Date(a.schedulePhase.completedAt) <= new Date(a.schedulePhase.plannedEnd)
      })

      const tamamlamaOrani = toplamGorev > 0 ? tamamlanan.length / toplamGorev : 0
      const zamanindaOrani =
        tamamlanan.length > 0 ? zamanindaTamamlanan.length / tamamlanan.length : 0

      const performansNotu = Math.round(tamamlamaOrani * 70 + zamanindaOrani * 30)

      return {
        ...p,
        password: undefined,
        performansNotu,
        toplamGorev,
        tamamlananGorev: tamamlanan.length,
        zamanindaTamamlanan: zamanindaTamamlanan.length,
      }
    })

    return NextResponse.json({ personeller: personellerPerformans })
  } catch (error: any) {
    console.error('PERSONEL API GET HATASI:', error)
    return NextResponse.json(
      { hata: error?.message || 'Personel verileri alınamadı.' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const atolyeId = await atolyeIdAl()

    if (!atolyeId) {
      return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    }

    const mevcut = await prisma.personel.count({
      where: { atolyeId, aktif: true },
    })

    if (mevcut >= 50) {
      return NextResponse.json(
        { hata: 'Maksimum 50 personel eklenebilir.' },
        { status: 400 }
      )
    }

    const veri = await req.json()
    const hashedPassword = veri.password ? await bcrypt.hash(veri.password, 10) : ''

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
        password: hashedPassword,
        aktif: true,
      },
    })

    return NextResponse.json({ personel: { ...personel, password: undefined } })
  } catch (error: any) {
    console.error('PERSONEL API POST HATASI:', error)
    return NextResponse.json(
      { hata: error?.message || 'Personel eklenemedi.' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const atolyeId = await atolyeIdAl()

    if (!atolyeId) {
      return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    }

    const veri = await req.json()

    const mevcut = await prisma.personel.findFirst({
      where: {
        id: veri.id,
        atolyeId,
      },
    })

    if (!mevcut) {
      return NextResponse.json(
        { hata: 'Personel bulunamadı.' },
        { status: 404 }
      )
    }

    const passwordData = veri.password
      ? { password: await bcrypt.hash(veri.password, 10) }
      : {}

    const personel = await prisma.personel.update({
      where: { id: veri.id },
      data: {
        ...passwordData,
        ad: veri.ad,
        soyad: veri.soyad,
        gorevi: veri.gorevi,
        bagliOlduguId: veri.bagliOlduguId || null,
        calismaYili: parseInt(veri.calismaYili) || 0,
        telefon: veri.telefon || '',
        email: veri.email || '',
        aktif: veri.aktif ?? true,
      },
    })

    return NextResponse.json({ personel: { ...personel, password: undefined } })
  } catch (error: any) {
    console.error('PERSONEL API PUT HATASI:', error)
    return NextResponse.json(
      { hata: error?.message || 'Personel güncellenemedi.' },
      { status: 500 }
    )
  }
}

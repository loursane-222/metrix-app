import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'


export async function GET() {
  try {
    const auth = await getAtolyeAuth()
    if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    const atolyeId = auth.atolyeId

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
          brutMaas: Number(p.brutMaas),
          sgkOrani: Number(p.sgkOrani),
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
        brutMaas: Number(p.brutMaas),
        sgkOrani: Number(p.sgkOrani),
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
    const auth = await getAtolyeAuth()
    if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    const atolyeId = auth.atolyeId

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
        rolGrubu: veri.rolGrubu || 'DIGER',
        brutMaas: parseFloat(veri.brutMaas) || 0,
        sgkOrani: parseFloat(veri.sgkOrani) || 20.5,
        iseBaslamaTarihi: veri.iseBaslamaTarihi ? new Date(veri.iseBaslamaTarihi) : null,
        gunlukCalismaGun: parseInt(veri.gunlukCalismaGun) || 5,
        userId: veri.userId || null,
      },
    })

    return NextResponse.json({
      personel: {
        ...personel,
        password: undefined,
        brutMaas: Number(personel.brutMaas),
        sgkOrani: Number(personel.sgkOrani),
      },
    })
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
    const auth = await getAtolyeAuth()
    if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    const atolyeId = auth.atolyeId

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
        ...(veri.rolGrubu !== undefined && { rolGrubu: veri.rolGrubu }),
        ...(veri.brutMaas !== undefined && { brutMaas: parseFloat(veri.brutMaas) || 0 }),
        ...(veri.sgkOrani !== undefined && { sgkOrani: parseFloat(veri.sgkOrani) || 20.5 }),
        ...(veri.iseBaslamaTarihi !== undefined && {
          iseBaslamaTarihi: veri.iseBaslamaTarihi ? new Date(veri.iseBaslamaTarihi) : null,
        }),
        ...(veri.gunlukCalismaGun !== undefined && {
          gunlukCalismaGun: parseInt(veri.gunlukCalismaGun) || 5,
        }),
        ...(veri.userId !== undefined && { userId: veri.userId || null }),
      },
    })

    return NextResponse.json({
      personel: {
        ...personel,
        password: undefined,
        brutMaas: Number(personel.brutMaas),
        sgkOrani: Number(personel.sgkOrani),
      },
    })
  } catch (error: any) {
    console.error('PERSONEL API PUT HATASI:', error)
    return NextResponse.json(
      { hata: error?.message || 'Personel güncellenemedi.' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'id gerekli.' }, { status: 400 })
  const personel = await prisma.personel.findFirst({ where: { id, atolyeId } })
  if (!personel) return NextResponse.json({ hata: 'Personel bulunamadı.' }, { status: 404 })
  await prisma.personel.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

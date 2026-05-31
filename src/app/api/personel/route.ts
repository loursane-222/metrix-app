import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import {
  getDefaultNotificationPreferencesForRole,
  notificationPreferenceCategories,
  type NotificationPreferenceInput,
} from '@/lib/notificationPreferenceDefaults'
import { notifyPersonnelCreated, notifyPersonnelPermissionChanged } from '@/lib/personnelCustomerNotifications'

const allowedNotificationCategories = new Set(notificationPreferenceCategories.map((item) => item.category))

function sameNumber(a: unknown, b: unknown) {
  return Number(a || 0) === Number(b || 0)
}

function sameDateValue(a: Date | null | undefined, b: unknown) {
  const bDate = b ? new Date(String(b)) : null
  return (a?.getTime() ?? null) === (bDate?.getTime() ?? null)
}

async function canManageNotificationPreferences(auth: NonNullable<Awaited<ReturnType<typeof getAtolyeAuth>>>) {
  if (auth.role === 'admin') return true
  if (!auth.personelId) return false

  const personel = await prisma.personel.findFirst({
    where: {
      id: auth.personelId,
      atolyeId: auth.atolyeId,
      aktif: true,
      isPatron: true,
    },
    select: { id: true },
  })

  return !!personel
}

function normalizeNotificationPreferences(input: unknown): NotificationPreferenceInput[] | null {
  if (!Array.isArray(input)) return null

  return input
    .map((item: any) => ({
      category: String(item?.category || ''),
      inApp: Boolean(item?.inApp),
      push: Boolean(item?.push),
    }))
    .filter((item) => allowedNotificationCategories.has(item.category as any)) as NotificationPreferenceInput[]
}

async function replaceNotificationPreferences(params: {
  atolyeId: string
  personelId: string
  preferences: NotificationPreferenceInput[]
}) {
  await prisma.$transaction(async (tx) => {
    await tx.notificationPreference.deleteMany({
      where: {
        atolyeId: params.atolyeId,
        personelId: params.personelId,
      },
    })

    if (params.preferences.length > 0) {
      await tx.notificationPreference.createMany({
        data: params.preferences.map((preference) => ({
          atolyeId: params.atolyeId,
          personelId: params.personelId,
          category: preference.category,
          inApp: preference.inApp,
          push: preference.push,
        })),
        skipDuplicates: true,
      })
    }
  })
}

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
        notificationPreferences: {
          orderBy: { category: 'asc' },
          select: { category: true, inApp: true, push: true },
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
    const isOwner = auth.role === 'admin'

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
    const wantsToManagePreferences = veri.notificationPreferences !== undefined
    const canManagePreferences = isOwner || (wantsToManagePreferences ? await canManageNotificationPreferences(auth) : false)

    if (veri.isPatron !== undefined && !isOwner) {
      return NextResponse.json({ hata: 'Patron bildirimi yetkisini sadece yönetici değiştirebilir.' }, { status: 403 })
    }
    if (wantsToManagePreferences && !canManagePreferences) {
      return NextResponse.json({ hata: 'Bildirim tercihlerini sadece yönetici değiştirebilir.' }, { status: 403 })
    }

    const hashedPassword = veri.password ? await bcrypt.hash(veri.password, 10) : ''
    const isPatron = isOwner ? Boolean(veri.isPatron) : false

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
        isPatron,
        rolGrubu: veri.rolGrubu || 'DIGER',
        brutMaas: parseFloat(veri.brutMaas) || 0,
        sgkOrani: parseFloat(veri.sgkOrani) || 20.5,
        iseBaslamaTarihi: veri.iseBaslamaTarihi ? new Date(veri.iseBaslamaTarihi) : null,
        gunlukCalismaGun: parseInt(veri.gunlukCalismaGun) || 5,
        userId: veri.userId || null,
      },
    })
    const preferences = normalizeNotificationPreferences(veri.notificationPreferences)
      ?? getDefaultNotificationPreferencesForRole(personel.rolGrubu, personel.isPatron)

    await replaceNotificationPreferences({
      atolyeId,
      personelId: personel.id,
      preferences,
    })

    await notifyPersonnelCreated({
      atolyeId,
      userId: auth.role === 'admin' ? auth.userId : undefined,
      personelId: auth.personelId,
      targetPersonelId: personel.id,
      ad: personel.ad,
      soyad: personel.soyad,
      rolGrubu: personel.rolGrubu,
      isPatron: personel.isPatron,
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
    const isOwner = auth.role === 'admin'

    const veri = await req.json()
    const wantsToManagePreferences = veri.notificationPreferences !== undefined
    const canManagePreferences = isOwner || (wantsToManagePreferences ? await canManageNotificationPreferences(auth) : false)

    if (veri.isPatron !== undefined && !isOwner) {
      return NextResponse.json({ hata: 'Patron bildirimi yetkisini sadece yönetici değiştirebilir.' }, { status: 403 })
    }
    if (wantsToManagePreferences && !canManagePreferences) {
      return NextResponse.json({ hata: 'Bildirim tercihlerini sadece yönetici değiştirebilir.' }, { status: 403 })
    }

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
        ...(isOwner && veri.isPatron !== undefined && { isPatron: Boolean(veri.isPatron) }),
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
    const preferences = normalizeNotificationPreferences(veri.notificationPreferences)
    if (preferences) {
      await replaceNotificationPreferences({
        atolyeId,
        personelId: personel.id,
        preferences,
      })
    }

    const patronChanged = isOwner && veri.isPatron !== undefined && Boolean(veri.isPatron) !== mevcut.isPatron
    const roleChanged = veri.rolGrubu !== undefined && veri.rolGrubu !== mevcut.rolGrubu
    const profileChanged =
      mevcut.ad !== veri.ad ||
      mevcut.soyad !== veri.soyad ||
      mevcut.gorevi !== veri.gorevi ||
      (mevcut.bagliOlduguId || null) !== (veri.bagliOlduguId || null) ||
      mevcut.calismaYili !== (parseInt(veri.calismaYili) || 0) ||
      mevcut.telefon !== (veri.telefon || '') ||
      mevcut.email !== (veri.email || '') ||
      mevcut.aktif !== (veri.aktif ?? true) ||
      !sameNumber(mevcut.brutMaas, veri.brutMaas) ||
      !sameNumber(mevcut.sgkOrani, veri.sgkOrani) ||
      !sameDateValue(mevcut.iseBaslamaTarihi, veri.iseBaslamaTarihi) ||
      mevcut.gunlukCalismaGun !== (parseInt(veri.gunlukCalismaGun) || 5) ||
      (mevcut.userId || null) !== (veri.userId || null) ||
      Boolean(veri.password)

    if (patronChanged || roleChanged || profileChanged || Boolean(preferences)) {
      await notifyPersonnelPermissionChanged({
        atolyeId,
        userId: auth.role === 'admin' ? auth.userId : undefined,
        personelId: auth.personelId,
        targetPersonelId: personel.id,
        ad: personel.ad,
        soyad: personel.soyad,
        action: patronChanged ? 'patron_changed' : preferences ? 'preferences_changed' : roleChanged ? 'permissions_changed' : 'updated',
        oldValue: {
          rolGrubu: mevcut.rolGrubu,
          isPatron: mevcut.isPatron,
          aktif: mevcut.aktif,
        },
        newValue: {
          rolGrubu: personel.rolGrubu,
          isPatron: personel.isPatron,
          aktif: personel.aktif,
          preferencesChanged: Boolean(preferences),
        },
      })
    }

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
  await notifyPersonnelPermissionChanged({
    atolyeId,
    userId: auth.role === 'admin' ? auth.userId : undefined,
    personelId: auth.personelId,
    targetPersonelId: personel.id,
    ad: personel.ad,
    soyad: personel.soyad,
    action: 'deleted',
  })
  return NextResponse.json({ ok: true })
}

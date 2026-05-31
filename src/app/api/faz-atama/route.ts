import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { notifyPhaseAssigned, notifyPhaseAssignmentRemoved } from "@/lib/scheduleNotifications";
import { NextRequest, NextResponse } from 'next/server'

// Bir faz için atamaları getir
export async function GET(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { searchParams } = new URL(req.url)
  const schedulePhaseId = searchParams.get('schedulePhaseId')
  if (!schedulePhaseId) return NextResponse.json({ atamalar: [] })

  const atamalar = await prisma.fazAtama.findMany({
    where: { schedulePhaseId },
    include: { personel: { select: { id: true, ad: true, soyad: true, gorevi: true } } }
  })
  return NextResponse.json({ atamalar })
}

// Atama ekle
export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { schedulePhaseId, personelId } = await req.json()

  const [phase, personel] = await Promise.all([
    prisma.schedulePhase.findFirst({
      where: { id: schedulePhaseId, workSchedule: { is: { atolyeId } } },
      select: { id: true },
    }),
    prisma.personel.findFirst({
      where: { id: personelId, atolyeId, aktif: true },
      select: { id: true },
    }),
  ])
  if (!phase || !personel)
    return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 403 })

  // 5 kişi limiti
  const mevcut = await prisma.fazAtama.count({ where: { schedulePhaseId } })
  if (mevcut >= 5) return NextResponse.json({ hata: 'Bir faza en fazla 5 kişi atanabilir.' }, { status: 400 })

  const atama = await prisma.fazAtama.create({
    data: { schedulePhaseId, personelId },
    include: { personel: { select: { id: true, ad: true, soyad: true, gorevi: true } } }
  })

  try {
    const phaseCtx = await prisma.schedulePhase.findUnique({
      where: { id: schedulePhaseId },
      select: {
        id: true,
        phase: true,
        workScheduleId: true,
        workSchedule: {
          select: {
            isId: true,
            is: { select: { musteriAdi: true, urunAdi: true } },
          },
        },
      },
    })
    const adSoyad = `${atama.personel.ad}${atama.personel.soyad ? " " + atama.personel.soyad : ""}`.trim()
    if (phaseCtx) {
      await notifyPhaseAssigned({
        atolyeId,
        userId: auth.userId ?? undefined,
        personelId: auth.personelId ?? undefined,
        jobId: phaseCtx.workSchedule.isId,
        jobName: phaseCtx.workSchedule.is.urunAdi,
        customerName: phaseCtx.workSchedule.is.musteriAdi,
        workScheduleId: phaseCtx.workScheduleId,
        phaseId: phaseCtx.id,
        phaseType: phaseCtx.phase,
        assignedPersonelIds: [atama.personel.id],
        assignedPersonelNames: [adSoyad],
        action: "added",
      })
    }
  } catch {
    // Bildirim hatası API response'u kırmasın.
  }

  return NextResponse.json({ atama })
}

// Atama sil
export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'ID gerekli.' }, { status: 400 })

  const existing = await prisma.fazAtama.findFirst({
    where: {
      id,
      schedulePhase: { workSchedule: { is: { atolyeId } } },
    },
    include: {
      personel: { select: { id: true, ad: true, soyad: true } },
      schedulePhase: {
        select: {
          id: true,
          phase: true,
          workScheduleId: true,
          workSchedule: {
            select: {
              isId: true,
              is: { select: { musteriAdi: true, urunAdi: true } },
            },
          },
        },
      },
    },
  })
  if (!existing)
    return NextResponse.json({ hata: 'Bulunamadı veya yetki yok.' }, { status: 404 })

  const result = await prisma.fazAtama.deleteMany({
    where: {
      id,
      schedulePhase: { workSchedule: { is: { atolyeId } } },
    },
  })
  if (result.count === 0)
    return NextResponse.json({ hata: 'Bulunamadı veya yetki yok.' }, { status: 404 })
  try {
    const adSoyad = `${existing.personel.ad}${existing.personel.soyad ? " " + existing.personel.soyad : ""}`.trim()
    await notifyPhaseAssignmentRemoved({
      atolyeId,
      userId: auth.userId ?? undefined,
      personelId: auth.personelId ?? undefined,
      jobId: existing.schedulePhase.workSchedule.isId,
      jobName: existing.schedulePhase.workSchedule.is.urunAdi,
      customerName: existing.schedulePhase.workSchedule.is.musteriAdi,
      workScheduleId: existing.schedulePhase.workScheduleId,
      phaseId: existing.schedulePhase.id,
      phaseType: existing.schedulePhase.phase,
      assignedPersonelIds: [existing.personel.id],
      assignedPersonelNames: [adSoyad],
    })
  } catch {
    // Bildirim hatası API response'u kırmasın.
  }
  return NextResponse.json({ ok: true })
}

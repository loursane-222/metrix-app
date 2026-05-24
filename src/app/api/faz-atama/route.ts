import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const FAZ_LABEL: Record<string, string> = {
  IMALAT: "imalat", MONTAJ: "montaj", OLCU: "ölçü", TAS_ALINACAK: "taş alınacak",
}



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
      select: { phase: true, workSchedule: { select: { is: { select: { musteriAdi: true } } } } },
    })
    const adSoyad = `${atama.personel.ad}${atama.personel.soyad ? " " + atama.personel.soyad : ""}`.trim()
    const musteriAdi = phaseCtx?.workSchedule?.is?.musteriAdi || "—"
    const fazLabel = FAZ_LABEL[phaseCtx?.phase ?? ""] ?? "faz"
    await logActivity({
      atolyeId,
      userId: auth.userId ?? undefined,
      type: "program_personel_eklendi",
      message: `${adSoyad} — ${musteriAdi} ${fazLabel} fazına atandı`,
      refId: schedulePhaseId,
      url: `/dashboard/is-programi?phaseId=${schedulePhaseId}`,
    })
  } catch {
    // fire-and-forget — log hatası API response'u kırmasın
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

  const result = await prisma.fazAtama.deleteMany({
    where: {
      id,
      schedulePhase: { workSchedule: { is: { atolyeId } } },
    },
  })
  if (result.count === 0)
    return NextResponse.json({ hata: 'Bulunamadı veya yetki yok.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

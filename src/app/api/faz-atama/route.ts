import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



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

  await prisma.fazAtama.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

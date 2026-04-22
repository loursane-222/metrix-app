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

// Bir faz için atamaları getir
export async function GET(req: NextRequest) {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

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
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

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
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'ID gerekli.' }, { status: 400 })

  await prisma.fazAtama.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

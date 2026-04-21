import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { id, durum, tasDurumu, tahsilat } = await req.json()

  const data: Record<string, unknown> = { durum }

  if (durum === 'onaylandi') {
    data.onaylanmaTarihi = new Date()
    data.kaybedilmeTarihi = null
  } else if (durum === 'kaybedildi') {
    data.kaybedilmeTarihi = new Date()
    data.onaylanmaTarihi = null
  } else if (durum === 'teklif_verildi') {
    data.onaylanmaTarihi = null
    data.kaybedilmeTarihi = null
  }

  if (tasDurumu !== undefined) data.tasDurumu = tasDurumu
  if (tahsilat !== undefined) data.tahsilat = parseFloat(String(tahsilat)) || 0

  const is = await prisma.is.update({
    where: { id },
    data,
  })

  return NextResponse.json({ is })
}

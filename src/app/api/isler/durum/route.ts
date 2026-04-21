import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { id, durum, tasDurumu, tahsilat } = await req.json()

  const data: Record<string, unknown> = { durum }
  if (tasDurumu !== undefined) data.tasDurumu = tasDurumu
  if (tahsilat !== undefined) data.tahsilat = parseFloat(String(tahsilat)) || 0

  const is = await prisma.is.update({
    where: { id },
    data,
  })

  return NextResponse.json({ is })
}

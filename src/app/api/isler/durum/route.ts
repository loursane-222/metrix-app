import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  const { id, durum } = await req.json()
  
  const is = await prisma.is.update({
    where: { id },
    data: { durum },
  })

  return NextResponse.json({ is })
}

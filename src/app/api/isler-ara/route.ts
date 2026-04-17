import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return NextResponse.json([])
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { atolye: true }
    })
    if (!user?.atolye) return NextResponse.json([])

    const q = request.nextUrl.searchParams.get("q") ?? ""
    if (q.length < 2) return NextResponse.json([])

    const isler = await prisma.is.findMany({
      where: {
        atolyeId: user.atolye.id,
        OR: [
          { teklifNo: { contains: q, mode: 'insensitive' } },
          { musteriAdi: { contains: q, mode: 'insensitive' } },
          { urunAdi: { contains: q, mode: 'insensitive' } },
        ]
      },
      select: { id: true, teklifNo: true, musteriAdi: true, urunAdi: true },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(isler)
  } catch {
    return NextResponse.json([])
  }
}

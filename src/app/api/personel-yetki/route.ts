import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error', 'warn'] })
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

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
  } catch {
    return null
  }
}

async function tabloHazirla() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "personel_yetkileri" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "personelId" TEXT NOT NULL UNIQUE,
      "isProgramiGorebilir" BOOLEAN NOT NULL DEFAULT true,
      "isProgramiDuzenleyebilir" BOOLEAN NOT NULL DEFAULT false,
      "imalatTamamlayabilir" BOOLEAN NOT NULL DEFAULT false,
      "maliyetGorebilir" BOOLEAN NOT NULL DEFAULT false,
      "musteriGorebilir" BOOLEAN NOT NULL DEFAULT false,
      "teklifOlusturabilir" BOOLEAN NOT NULL DEFAULT false,
      "atolyeAyarGorebilir" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

export async function GET(req: NextRequest) {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  await tabloHazirla()

  const personelId = req.nextUrl.searchParams.get('personelId')
  if (!personelId) return NextResponse.json({ yetki: null })

  const personel = await prisma.personel.findFirst({ where: { id: personelId, atolyeId } })
  if (!personel) return NextResponse.json({ hata: 'Personel bulunamadı.' }, { status: 404 })

  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
    personelId
  )

  if (rows[0]) return NextResponse.json({ yetki: rows[0] })

  await prisma.$executeRawUnsafe(
    `INSERT INTO "personel_yetkileri" ("personelId") VALUES ($1) ON CONFLICT ("personelId") DO NOTHING`,
    personelId
  )

  const yeni: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
    personelId
  )

  return NextResponse.json({ yetki: yeni[0] || null })
}

export async function POST(req: NextRequest) {
  const atolyeId = await atolyeIdAl()
  if (!atolyeId) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  await tabloHazirla()

  const body = await req.json()
  const personelId = body.personelId

  if (!personelId) return NextResponse.json({ hata: 'personelId gerekli.' }, { status: 400 })

  const personel = await prisma.personel.findFirst({ where: { id: personelId, atolyeId } })
  if (!personel) return NextResponse.json({ hata: 'Personel bulunamadı.' }, { status: 404 })

  const b = {
    isProgramiGorebilir: !!body.isProgramiGorebilir,
    isProgramiDuzenleyebilir: !!body.isProgramiDuzenleyebilir,
    imalatTamamlayabilir: !!body.imalatTamamlayabilir,
    maliyetGorebilir: !!body.maliyetGorebilir,
    musteriGorebilir: !!body.musteriGorebilir,
    teklifOlusturabilir: !!body.teklifOlusturabilir,
    atolyeAyarGorebilir: !!body.atolyeAyarGorebilir,
  }

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO "personel_yetkileri"
      ("personelId", "isProgramiGorebilir", "isProgramiDuzenleyebilir", "imalatTamamlayabilir", "maliyetGorebilir", "musteriGorebilir", "teklifOlusturabilir", "atolyeAyarGorebilir", "updatedAt")
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_TIMESTAMP)
    ON CONFLICT ("personelId") DO UPDATE SET
      "isProgramiGorebilir" = EXCLUDED."isProgramiGorebilir",
      "isProgramiDuzenleyebilir" = EXCLUDED."isProgramiDuzenleyebilir",
      "imalatTamamlayabilir" = EXCLUDED."imalatTamamlayabilir",
      "maliyetGorebilir" = EXCLUDED."maliyetGorebilir",
      "musteriGorebilir" = EXCLUDED."musteriGorebilir",
      "teklifOlusturabilir" = EXCLUDED."teklifOlusturabilir",
      "atolyeAyarGorebilir" = EXCLUDED."atolyeAyarGorebilir",
      "updatedAt" = CURRENT_TIMESTAMP
    `,
    personelId,
    b.isProgramiGorebilir,
    b.isProgramiDuzenleyebilir,
    b.imalatTamamlayabilir,
    b.maliyetGorebilir,
    b.musteriGorebilir,
    b.teklifOlusturabilir,
    b.atolyeAyarGorebilir
  )

  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
    personelId
  )

  return NextResponse.json({ yetki: rows[0] || null })
}

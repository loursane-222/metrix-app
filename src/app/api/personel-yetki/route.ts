import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { notifyPersonnelPermissionChanged } from '@/lib/personnelCustomerNotifications'



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
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

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
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

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

  const oncekiRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
    personelId
  )
  const onceki = oncekiRows[0] || null

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

  const changed = !onceki || Object.entries(b).some(([key, value]) => Boolean(onceki[key]) !== value)
  if (changed) {
    await notifyPersonnelPermissionChanged({
      atolyeId,
      userId: auth.role === 'admin' ? auth.userId : undefined,
      personelId: auth.personelId,
      targetPersonelId: personel.id,
      ad: personel.ad,
      soyad: personel.soyad,
      action: 'permissions_changed',
      oldValue: onceki,
      newValue: rows[0] || null,
    })
  }

  return NextResponse.json({ yetki: rows[0] || null })
}

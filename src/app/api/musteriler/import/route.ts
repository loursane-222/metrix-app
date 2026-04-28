import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import ExcelJS from 'exceljs'

const prisma = new PrismaClient()

async function kullaniciAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string }
  } catch {
    return null
  }
}

function temiz(v: any) {
  return String(v || '').trim()
}

function num(v: any) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })

  if (!atolye) {
    return NextResponse.json({ hata: 'Atölye bulunamadı. Önce sistem girişini tamamla.' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ hata: 'Dosya yok' }, { status: 400 })
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer() as any)

  const ws = wb.worksheets[0]
  if (!ws) return NextResponse.json({ hata: 'Sheet yok' }, { status: 400 })

  const headers = (ws.getRow(1).values as any[])
    .slice(1)
    .map(h => temiz(h).toLowerCase())

  // 🔥 AKILLI MAP
  const map: any = {}
  headers.forEach((h, i) => {
    if (h.includes('firma')) map.firmaAdi = i + 1
    if (h === 'ad') map.ad = i + 1
    if (h === 'soyad') map.soyad = i + 1
    if (h.includes('telefon')) map.telefon = i + 1
    if (h.includes('mail')) map.email = i + 1
    if (h.includes('bakiye')) map.acilisBakiyesi = i + 1
    if (h.includes('tip')) map.bakiyeTipi = i + 1
  })

  let eklenen = 0
  let atlanan = 0
  let hatalar: string[] = []

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i)

    const firmaAdi = temiz(row.getCell(map.firmaAdi).value)
    const ad = temiz(row.getCell(map.ad).value)
    const soyad = temiz(row.getCell(map.soyad).value)
    const telefon = temiz(row.getCell(map.telefon).value)
    const email = temiz(row.getCell(map.email).value)
    const bakiye = num(row.getCell(map.acilisBakiyesi).value)
    const tip = temiz(row.getCell(map.bakiyeTipi).value).toLowerCase() || 'borc'

    if (!firmaAdi && !ad && !soyad) {
      atlanan++
      continue
    }

    const varMi = await prisma.musteri.findFirst({
      where: { atolyeId: atolye.id, firmaAdi, ad, soyad, email }
    })

    if (varMi) {
      atlanan++
      continue
    }

    await prisma.musteri.create({
      data: {
        atolyeId: atolye.id,
        firmaAdi,
        ad,
        soyad,
        telefon,
        email,
        acilisBakiyesi: bakiye,
        bakiyeTipi: tip === 'alacak' ? 'alacak' : 'borc'
      }
    })

    eklenen++
  }

  return NextResponse.json({
    mesaj: 'OK',
    eklenen,
    atlanan,
    hatalar
  })
}

import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'



function temiz(v: any) {
  return String(v || '').trim()
}

function num(v: any) {
  const n = Number(v)
  return isNaN(n) ? 0 : n
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

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
      where: { atolyeId: atolyeId, firmaAdi, ad, soyad, email }
    })

    if (varMi) {
      atlanan++
      continue
    }

    await prisma.musteri.create({
      data: {
        atolyeId: atolyeId,
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

import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'



// GET — tüm giderler + kategori ortalamaları
export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const giderler = await prisma.$queryRawUnsafe(`
    SELECT * FROM "AylikGider" WHERE "atolyeId" = $1 ORDER BY tarih DESC
  `, atolyeId) as any[]

  // Her kategori için ortalama hesapla
  const kategoriler = ['toplamMaas','sgkGideri','yemekGideri','yolGideri','kira','elektrik','su','dogalgaz','internet','sarfMalzeme','diger']
  const ortalamalar: Record<string, number> = {}

  for (const kat of kategoriler) {
    const rows = giderler.filter((g: any) => g.kategori === kat)
    if (rows.length > 0) {
      const toplam = rows.reduce((acc: number, g: any) => acc + Number(g.tutar), 0)
      ortalamalar[kat] = Math.round(toplam / rows.length)
    }
  }

  return NextResponse.json({ giderler, ortalamalar })
}

// POST — yeni gider kaydet
export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { tarih, kategori, aciklama, tutar } = await req.json()
  if (!tarih || !kategori || !tutar) return NextResponse.json({ hata: 'Eksik alan' }, { status: 400 })

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)

  await prisma.$executeRawUnsafe(`
    INSERT INTO "AylikGider" (id, "atolyeId", tarih, kategori, aciklama, tutar, "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, id, atolyeId, new Date(tarih), kategori, aciklama || '', Number(tutar))

  // Ortalamayla atölye tablosunu güncelle
  const rows = await prisma.$queryRawUnsafe(`
    SELECT kategori, AVG(tutar::numeric) as ort FROM "AylikGider"
    WHERE "atolyeId" = $1 GROUP BY kategori
  `, atolyeId) as any[]

  const guncelle: Record<string, number> = {}
  const kolonMap: Record<string, string> = {
    toplamMaas: 'toplamMaas', sgkGideri: 'sgkGideri', yemekGideri: 'yemekGideri',
    yolGideri: 'yolGideri', kira: 'kira', elektrik: 'elektrik', su: 'su',
    dogalgaz: 'dogalgaz', internet: 'internet', sarfMalzeme: 'sarfMalzeme'
  }

  for (const r of rows) {
    if (kolonMap[r.kategori]) {
      guncelle[kolonMap[r.kategori]] = Math.round(Number(r.ort))
    }
  }

  if (Object.keys(guncelle).length > 0) {
    await prisma.atolye.update({ where: { id: atolyeId }, data: guncelle })
  }

  return NextResponse.json({ ok: true, id })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ hata: 'ID gerekli' }, { status: 400 })

  await prisma.$executeRawUnsafe(`DELETE FROM "AylikGider" WHERE id = $1`, id)
  return NextResponse.json({ ok: true })
}

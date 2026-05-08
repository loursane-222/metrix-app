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

const GECERLI_TIPLER = ['bayi', 'mimar', 'muteahhit', 'son_kullanici', 'imalatci']

function musteriTipiNormalize(v: string): string {
  const t = v.toLowerCase().trim()
  if (t.includes('bayi')) return 'bayi'
  if (t.includes('mimar')) return 'mimar'
  if (t.includes('muteahhit') || t.includes('müteahhit')) return 'muteahhit'
  if (t.includes('son') || t.includes('kullanici') || t.includes('kullanıcı') || t.includes('ev')) return 'son_kullanici'
  if (t.includes('imalat')) return 'imalatci'
  if (GECERLI_TIPLER.includes(t)) return t
  return 'son_kullanici' // varsayılan
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

  const map: any = {}
  headers.forEach((h, i) => {
    if (h.includes('firma')) map.firmaAdi = i + 1
    if (h === 'ad') map.ad = i + 1
    if (h === 'soyad') map.soyad = i + 1
    if (h.includes('telefon')) map.telefon = i + 1
    if (h.includes('mail')) map.email = i + 1
    if (h.includes('musteri') && h.includes('tip')) map.musteriTipi = i + 1
    if (h.includes('tip') && !h.includes('musteri') && !h.includes('bakiye')) map.bakiyeTipi = i + 1
    if (h.includes('bakiye') && !h.includes('tip')) map.acilisBakiyesi = i + 1
  })

  let eklenen = 0
  let atlanan = 0
  let guncellenen = 0
  const hatalar: string[] = []

  for (let i = 2; i <= ws.rowCount; i++) {
    const row = ws.getRow(i)

    const firmaAdi = temiz(row.getCell(map.firmaAdi || 0).value)
    const ad = temiz(row.getCell(map.ad || 0).value)
    const soyad = temiz(row.getCell(map.soyad || 0).value)
    const telefon = temiz(row.getCell(map.telefon || 0).value)
    const email = temiz(row.getCell(map.email || 0).value)
    const musteriTipiRaw = map.musteriTipi ? temiz(row.getCell(map.musteriTipi).value) : ''
    const musteriTipi = musteriTipiRaw ? musteriTipiNormalize(musteriTipiRaw) : 'son_kullanici'
    const bakiye = num(row.getCell(map.acilisBakiyesi || 0).value)
    const tipRaw = map.bakiyeTipi ? temiz(row.getCell(map.bakiyeTipi).value).toLowerCase() : 'borc'
    const bakiyeTipi = tipRaw === 'alacak' ? 'alacak' : 'borc'

    // Açıklama satırını atla
    if (firmaAdi.startsWith('#') || ad.startsWith('#')) {
      continue
    }

    if (!firmaAdi && !ad && !soyad) {
      atlanan++
      continue
    }

    try {
      const varMi = await prisma.musteri.findFirst({
        where: { atolyeId, firmaAdi, ad, soyad }
      })

      if (varMi) {
        // Mevcut müşteriyi güncelle (telefon/email/tip eksikse doldur)
        await prisma.musteri.update({
          where: { id: varMi.id },
          data: {
            telefon: varMi.telefon || telefon,
            email: varMi.email || email,
            musteriTipi: varMi.musteriTipi || musteriTipi,
          }
        })
        guncellenen++
        continue
      }

      await prisma.musteri.create({
        data: {
          atolyeId,
          firmaAdi,
          ad,
          soyad,
          telefon,
          email,
          musteriTipi,
          acilisBakiyesi: bakiye,
          bakiyeTipi,
        }
      })
      eklenen++
    } catch (e: any) {
      hatalar.push(`Satır ${i}: ${e.message}`)
    }
  }

  return NextResponse.json({ mesaj: 'OK', eklenen, guncellenen, atlanan, hatalar })
}

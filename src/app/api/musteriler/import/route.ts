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
    return payload as { id: string; email: string }
  } catch {
    return null
  }
}

function metin(v: unknown) {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function sayi(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) {
    return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  }

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id }
  })

  if (!atolye) {
    return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ hata: 'Dosya bulunamadı.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(Buffer.from(arrayBuffer))

  const ws = workbook.worksheets[0]
  if (!ws) {
    return NextResponse.json({ hata: 'Excel sayfası bulunamadı.' }, { status: 400 })
  }

  const headerRow = ws.getRow(1)
  const headers = headerRow.values as Array<string>

  const beklenen = ['firmaAdi', 'ad', 'soyad', 'telefon', 'email', 'acilisBakiyesi', 'bakiyeTipi']

  const bulunan = headers.slice(1).map(h => String(h || '').trim())
  const uygun = beklenen.every((h, i) => bulunan[i] === h)

  if (!uygun) {
    return NextResponse.json({
      hata: 'Excel şablonu geçersiz. Lütfen sistemden indirilen şablonu kullanın.',
      bulunanKolonlar: bulunan,
      beklenenKolonlar: beklenen
    }, { status: 400 })
  }

  let eklenen = 0
  let atlanan = 0
  const hatalar: string[] = []

  for (let rowNumber = 2; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber)

    const firmaAdi = metin(row.getCell(1).value)
    const ad = metin(row.getCell(2).value)
    const soyad = metin(row.getCell(3).value)
    const telefon = metin(row.getCell(4).value)
    const email = metin(row.getCell(5).value)
    const acilisBakiyesi = sayi(row.getCell(6).value)
    const bakiyeTipi = metin(row.getCell(7).value).toLowerCase()

    const tamamenBos =
      !firmaAdi && !ad && !soyad && !telefon && !email && !acilisBakiyesi && !bakiyeTipi

    if (tamamenBos) {
      continue
    }

    if (!firmaAdi && !ad && !soyad) {
      atlanan += 1
      hatalar.push(`${rowNumber}. satır: Firma adı veya ad/soyad boş olamaz.`)
      continue
    }

    if (bakiyeTipi && bakiyeTipi !== 'borc' && bakiyeTipi !== 'alacak') {
      atlanan += 1
      hatalar.push(`${rowNumber}. satır: bakiyeTipi sadece "borc" veya "alacak" olabilir.`)
      continue
    }

    const mevcut = await prisma.musteri.findFirst({
      where: {
        atolyeId: atolye.id,
        firmaAdi,
        ad,
        soyad,
        email,
      }
    })

    if (mevcut) {
      atlanan += 1
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
        acilisBakiyesi,
        bakiyeTipi: bakiyeTipi || 'borc'
      }
    })

    eklenen += 1
  }

  return NextResponse.json({
    mesaj: 'İçe aktarma tamamlandı.',
    eklenen,
    atlanan,
    hatalar,
  })
}

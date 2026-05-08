import { NextResponse } from 'next/server'
import { Workbook } from 'exceljs'

export async function GET() {
  const wb = new Workbook()
  const ws = wb.addWorksheet('Musteriler')

  ws.columns = [
    { header: 'firmaAdi', key: 'firmaAdi', width: 24 },
    { header: 'ad', key: 'ad', width: 18 },
    { header: 'soyad', key: 'soyad', width: 18 },
    { header: 'telefon', key: 'telefon', width: 18 },
    { header: 'email', key: 'email', width: 28 },
    { header: 'musteriTipi', key: 'musteriTipi', width: 18 },
    { header: 'acilisBakiyesi', key: 'acilisBakiyesi', width: 18 },
    { header: 'bakiyeTipi', key: 'bakiyeTipi', width: 14 },
  ]

  // Açıklama satırı
  const aciklamaRow = ws.addRow({
    firmaAdi: '# Firma adı (opsiyonel)',
    ad: '# Ad (zorunlu)',
    soyad: '# Soyad',
    telefon: '# 05551234567',
    email: '# mail@ornek.com',
    musteriTipi: '# bayi / mimar / muteahhit / son_kullanici / imalatci',
    acilisBakiyesi: '# Sayı (opsiyonel)',
    bakiyeTipi: '# borc / alacak',
  })
  aciklamaRow.font = { italic: true, color: { argb: 'FF9CA3AF' } }

  ws.addRow({
    firmaAdi: 'Baykal Mobilya',
    ad: 'Metin',
    soyad: 'Baykal',
    telefon: '05551234567',
    email: 'metin@baykal.com',
    musteriTipi: 'bayi',
    acilisBakiyesi: 125000,
    bakiyeTipi: 'borc',
  })

  ws.addRow({
    firmaAdi: 'ABC Mimarlık',
    ad: 'Ayşe',
    soyad: 'Yılmaz',
    telefon: '05331234567',
    email: 'ayse@abc.com',
    musteriTipi: 'mimar',
    acilisBakiyesi: 18000,
    bakiyeTipi: 'alacak',
  })

  ws.addRow({
    firmaAdi: '',
    ad: 'Ahmet',
    soyad: 'Kaya',
    telefon: '05441234567',
    email: '',
    musteriTipi: 'son_kullanici',
    acilisBakiyesi: 0,
    bakiyeTipi: 'borc',
  })

  // Başlık satırı formatı
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
  headerRow.height = 22

  // musteriTipi kolonuna dropdown validasyon notu
  ws.getColumn('musteriTipi').width = 22

  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="musteri-sablonu.xlsx"',
    },
  })
}

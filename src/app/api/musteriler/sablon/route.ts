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
    { header: 'acilisBakiyesi', key: 'acilisBakiyesi', width: 18 },
    { header: 'bakiyeTipi', key: 'bakiyeTipi', width: 14 },
  ]

  ws.addRow({
    firmaAdi: 'Baykal Mobilya',
    ad: 'Metin',
    soyad: 'Baykal',
    telefon: '05551234567',
    email: 'metin@baykal.com',
    acilisBakiyesi: 125000,
    bakiyeTipi: 'borc',
  })

  ws.addRow({
    firmaAdi: 'ABC Mimarlik',
    ad: 'Ayse',
    soyad: 'Yilmaz',
    telefon: '05331234567',
    email: 'ayse@abc.com',
    acilisBakiyesi: 18000,
    bakiyeTipi: 'alacak',
  })

  ws.getRow(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="musteri-sablonu.xlsx"',
    },
  })
}

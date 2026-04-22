import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const prisma = new PrismaClient()

async function kullaniciAl() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    return payload as { id: string; email: string }
  } catch { return null }
}

export async function GET() {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({ aylar: [] })

  const isler = await prisma.is.findMany({
    where: { atolyeId: atolye.id },
    select: {
      id: true, durum: true,
      satisFiyati: true, toplamMaliyet: true, tahsilat: true,
      kirilanTasPlaka: true, kullanilanPlakaSayisi: true,
      createdAt: true, onaylanmaTarihi: true, kaybedilmeTarihi: true,
    },
  })

  const buYil = new Date().getFullYear()
  const enEskiYil = isler.length > 0
    ? Math.min(...isler.map(i => new Date(i.createdAt).getFullYear()))
    : buYil

  const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

  // Her iş için efektif tarihleri hesapla
  // onaylanmaTarihi null ise createdAt fallback olarak kullan
  function onayTarihi(i: typeof isler[0]): Date {
    return i.onaylanmaTarihi ? new Date(i.onaylanmaTarihi) : new Date(i.createdAt)
  }
  function kayipTarihi(i: typeof isler[0]): Date {
    return i.kaybedilmeTarihi ? new Date(i.kaybedilmeTarihi) : new Date(i.createdAt)
  }

  const sonuclar = []

  for (let yil = enEskiYil; yil <= buYil; yil++) {
    for (let ay = 0; ay < 12; ay++) {
      const ayBaslangic = new Date(yil, ay, 1)
      const ayBitis = new Date(yil, ay + 1, 0, 23, 59, 59, 999)

      const ayIcinde = (tarih: Date) => tarih >= ayBaslangic && tarih <= ayBitis

      // Bu ayda oluşturulan tüm teklifler
      const buAyOlusturulan = isler.filter(i => ayIcinde(new Date(i.createdAt)))

      // Bu ayda onaylanan işler (onay tarihine göre)
      const onaylananlar = isler.filter(i =>
        i.durum === 'onaylandi' && ayIcinde(onayTarihi(i))
      )

      // Bu ayda kaybedilen işler
      const kaybedilenler = isler.filter(i =>
        i.durum === 'kaybedildi' && ayIcinde(kayipTarihi(i))
      )

      // Bekleyenler: bu ayda oluşturulmuş ve hala teklif_verildi durumunda
      const bekleyenler = buAyOlusturulan.filter(i => i.durum === 'teklif_verildi')

      const toplamTeklif = buAyOlusturulan.length
      if (toplamTeklif === 0 && onaylananlar.length === 0) continue

      const onaylanmaOrani = toplamTeklif > 0
        ? (onaylananlar.length / toplamTeklif) * 100
        : 0

      sonuclar.push({
        yil, ay: ay + 1, ayAdi: TR_MONTHS[ay],
        toplamTeklif,
        onaylananTeklif:  onaylananlar.length,
        bekleyenTeklif:   bekleyenler.length,
        kaybedilenTeklif: kaybedilenler.length,
        onaylanmaOrani,
        toplamTeklifTutari:    buAyOlusturulan.reduce((a, i) => a + Number(i.satisFiyati), 0),
        onaylananTeklifTutari: onaylananlar.reduce((a, i) => a + Number(i.satisFiyati), 0),
        kaybedilenTeklifTutari:kaybedilenler.reduce((a, i) => a + Number(i.satisFiyati), 0),
        toplamTahsilat:  onaylananlar.reduce((a, i) => a + Number(i.tahsilat || 0), 0),
        kirilanTas:      buAyOlusturulan.reduce((a, i) => a + Number(i.kirilanTasPlaka || 0), 0),
        toplamPlaka:     buAyOlusturulan.reduce((a, i) => a + Number(i.kullanilanPlakaSayisi || 0), 0),
        toplamMaliyet:   onaylananlar.reduce((a, i) => a + Number(i.toplamMaliyet), 0),
        toplamKazanc:    onaylananlar.reduce((a, i) => a + Number(i.satisFiyati), 0)
                       - onaylananlar.reduce((a, i) => a + Number(i.toplamMaliyet), 0),
      })
    }
  }

  return NextResponse.json({ aylar: sonuclar.reverse() })
}

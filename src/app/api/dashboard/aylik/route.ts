import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const isler = await prisma.is.findMany({
    where: { atolyeId: atolyeId },
    select: {
      id: true, durum: true,
      satisFiyati: true, toplamMaliyet: true, tahsilat: true,
      kirilanTasPlaka: true, kullanilanPlakaSayisi: true,
      createdAt: true, onaylanmaTarihi: true, kaybedilmeTarihi: true,
    },
  })

  if (isler.length === 0) return NextResponse.json({ aylar: [] })

  const buYil = new Date().getFullYear()
  const enEskiYil = Math.min(...isler.map(i => new Date(i.createdAt).getFullYear()))

  const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran',
                     'Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']

  // Bir tarihin hangi yıl/ay'a düştüğünü döndür
  function ayKey(d: Date) {
    return { yil: d.getFullYear(), ay: d.getMonth() } // ay: 0-11
  }

  // Her iş için efektif tarihleri belirle
  function onayAy(i: typeof isler[0]) {
    return ayKey(new Date(i.onaylanmaTarihi ?? i.createdAt))
  }
  function kayipAy(i: typeof isler[0]) {
    return ayKey(new Date(i.kaybedilmeTarihi ?? i.createdAt))
  }
  function olusturmaAy(i: typeof isler[0]) {
    return ayKey(new Date(i.createdAt))
  }

  const sonuclar = []

  for (let yil = enEskiYil; yil <= buYil; yil++) {
    for (let ay = 0; ay < 12; ay++) {

      const eslesir = (k: { yil: number; ay: number }) => k.yil === yil && k.ay === ay

      // Bu ayda oluşturulan tüm teklifler
      const buAyOlusturulan = isler.filter(i => eslesir(olusturmaAy(i)))

      // Bu ayda onaylanan işler
      const onaylananlar = isler.filter(i =>
        i.durum === 'onaylandi' && eslesir(onayAy(i))
      )

      // Bu ayda kaybedilen işler
      const kaybedilenler = isler.filter(i =>
        i.durum === 'kaybedildi' && eslesir(kayipAy(i))
      )

      // Bekleyenler: bu ayda oluşturulmuş ve hala bekliyor
      const bekleyenler = buAyOlusturulan.filter(i => i.durum === 'teklif_verildi')

      const toplamTeklif = buAyOlusturulan.length

      // Hiç veri yoksa bu ayı gösterme
      if (toplamTeklif === 0 && onaylananlar.length === 0 && kaybedilenler.length === 0) continue

      const onaylanmaOrani = toplamTeklif > 0
        ? (onaylananlar.length / toplamTeklif) * 100
        : 0

      sonuclar.push({
        yil,
        ay: ay + 1,
        ayAdi: TR_MONTHS[ay],
        toplamTeklif,
        onaylananTeklif:   onaylananlar.length,
        bekleyenTeklif:    bekleyenler.length,
        kaybedilenTeklif:  kaybedilenler.length,
        onaylanmaOrani,
        toplamTeklifTutari:     buAyOlusturulan.reduce((a, i) => a + Number(i.satisFiyati), 0),
        onaylananTeklifTutari:  onaylananlar.reduce((a, i) => a + Number(i.satisFiyati), 0),
        kaybedilenTeklifTutari: kaybedilenler.reduce((a, i) => a + Number(i.satisFiyati), 0),
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

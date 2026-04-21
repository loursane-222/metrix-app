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
      id: true,
      durum: true,
      satisFiyati: true,
      toplamMaliyet: true,
      tahsilat: true,
      kirilanTasPlaka: true,
      kullanilanPlakaSayisi: true,
      createdAt: true,
      onaylanmaTarihi: true,
      kaybedilmeTarihi: true,
    },
  })

  // Yılı belirle: en eski işin yılından bu yıla kadar
  const buYil = new Date().getFullYear()
  const enEskiYil = isler.length > 0
    ? Math.min(...isler.map(i => new Date(i.createdAt).getFullYear()))
    : buYil

  type AyOzet = {
    yil: number; ay: number; ayAdi: string;
    toplamTeklif: number; onaylananTeklif: number; bekleyenTeklif: number; kaybedilenTeklif: number;
    onaylanmaOrani: number;
    toplamTeklifTutari: number; onaylananTeklifTutari: number; kaybedilenTeklifTutari: number;
    toplamTahsilat: number; kirilanTas: number; toplamPlaka: number;
    toplamMaliyet: number; toplamKazanc: number;
  }

  const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
  const sonuclar: AyOzet[] = []

  for (let yil = enEskiYil; yil <= buYil; yil++) {
    for (let ay = 0; ay < 12; ay++) {
      const ayBaslangic = new Date(yil, ay, 1)
      const ayBitis = new Date(yil, ay + 1, 0, 23, 59, 59)

      // Bu ayda teklif verilen (oluşturulan) ama hala bekleyen işler
      const bekleyenler = isler.filter(i => {
        if (i.durum !== 'teklif_verildi') return false
        const olusturma = new Date(i.createdAt)
        return olusturma >= ayBaslangic && olusturma <= ayBitis
      })

      // Bu ayda onaylanan işler (onaylanma tarihine göre)
      const onaylananlar = isler.filter(i => {
        if (i.durum !== 'onaylandi' || !i.onaylanmaTarihi) return false
        const onay = new Date(i.onaylanmaTarihi)
        return onay >= ayBaslangic && onay <= ayBitis
      })

      // Bu ayda kaybedilen işler (kaybedilme tarihine göre)
      // Kaybedilme tarihi yoksa oluşturulma tarihine bak
      const kaybedilenler = isler.filter(i => {
        if (i.durum !== 'kaybedildi') return false
        const tarih = i.kaybedilmeTarihi
          ? new Date(i.kaybedilmeTarihi)
          : new Date(i.createdAt)
        return tarih >= ayBaslangic && tarih <= ayBitis
      })

      // Bu ayda oluşturulan tüm teklifler (toplam teklif sayısı için)
      const buAyTeklifler = isler.filter(i => {
        const olusturma = new Date(i.createdAt)
        return olusturma >= ayBaslangic && olusturma <= ayBitis
      })

      const toplamTeklif = buAyTeklifler.length
      const onaylananTeklif = onaylananlar.length
      const bekleyenTeklif = bekleyenler.length
      const kaybedilenTeklif = kaybedilenler.length

      // Boş ayı atla
      if (toplamTeklif === 0 && onaylananTeklif === 0 && bekleyenTeklif === 0) continue

      const onaylanmaOrani = toplamTeklif > 0 ? (onaylananTeklif / toplamTeklif) * 100 : 0

      const toplamTeklifTutari = buAyTeklifler.reduce((a, i) => a + Number(i.satisFiyati), 0)
      const onaylananTeklifTutari = onaylananlar.reduce((a, i) => a + Number(i.satisFiyati), 0)
      const kaybedilenTeklifTutari = kaybedilenler.reduce((a, i) => a + Number(i.satisFiyati), 0)
      const toplamTahsilat = onaylananlar.reduce((a, i) => a + Number(i.tahsilat || 0), 0)
      const kirilanTas = buAyTeklifler.reduce((a, i) => a + Number(i.kirilanTasPlaka || 0), 0)
      const toplamPlaka = buAyTeklifler.reduce((a, i) => a + Number(i.kullanilanPlakaSayisi || 0), 0)
      const toplamMaliyet = onaylananlar.reduce((a, i) => a + Number(i.toplamMaliyet), 0)
      const toplamKazanc = onaylananTeklifTutari - toplamMaliyet

      sonuclar.push({
        yil, ay: ay + 1, ayAdi: TR_MONTHS[ay],
        toplamTeklif, onaylananTeklif, bekleyenTeklif, kaybedilenTeklif,
        onaylanmaOrani,
        toplamTeklifTutari, onaylananTeklifTutari, kaybedilenTeklifTutari,
        toplamTahsilat, kirilanTas, toplamPlaka,
        toplamMaliyet, toplamKazanc,
      })
    }
  }

  return NextResponse.json({ aylar: sonuclar.reverse() }) // En yeni ay üstte
}

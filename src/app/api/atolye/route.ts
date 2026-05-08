import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { normalizeMtulInput, normalizeMtulDisplay } from "@/lib/normalizeMtul";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



function toplamHesapla(atolye: {
  toplamMaas: unknown; sgkGideri: unknown; yemekGideri: unknown; yolGideri: unknown;
  kira: unknown; elektrik: unknown; su: unknown; dogalgaz: unknown; internet: unknown; sarfMalzeme: unknown;
  aylikPorselenPlaka: unknown; aylikKuvarsPlaka: unknown; aylikDogaltasPlaka: unknown;
  makineler: { aylikAmortisman: unknown }[];
  araclar: { aylikToplamSabitMaliyet: unknown }[];
}) {
  const personelGider = Number(atolye.toplamMaas) + Number(atolye.sgkGideri) + Number(atolye.yemekGideri) + Number(atolye.yolGideri)
  const sabitGider = Number(atolye.kira) + Number(atolye.elektrik) + Number(atolye.su) + Number(atolye.dogalgaz) + Number(atolye.internet) + Number(atolye.sarfMalzeme)
  const makineAmortisman = atolye.makineler.reduce((acc, m) => acc + Number(m.aylikAmortisman), 0)
  const aracMaliyet = atolye.araclar.reduce((acc, a) => acc + Number(a.aylikToplamSabitMaliyet), 0)
  const toplamAylikGider = personelGider + sabitGider + makineAmortisman + aracMaliyet
  const toplamAylikDakika = 26 * 8 * 60
  const dakikaMaliyeti = toplamAylikDakika > 0 ? toplamAylikGider / toplamAylikDakika : 0
  const gunlukGider = toplamAylikGider / 26
  return { toplamAylikGider, dakikaMaliyeti, gunlukGider }
}

export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: auth.userId },
    include: { makineler: true, araclar: true }
  })
  if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

  const { toplamAylikGider, dakikaMaliyeti, gunlukGider } = toplamHesapla(atolye)
  return NextResponse.json({ atolye, toplamAylikGider, dakikaMaliyeti, gunlukGider })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const veri = await req.json()

  const mevcutAtoyle = await prisma.atolye.findUnique({
    where: { userId: auth.userId },
    include: { makineler: true, araclar: true }
  })

  const makineler = mevcutAtoyle?.makineler || []
  const araclar = mevcutAtoyle?.araclar || []

  const personelGider = (parseFloat(veri.toplamMaas) || 0) + (parseFloat(veri.sgkGideri) || 0) + (parseFloat(veri.yemekGideri) || 0) + (parseFloat(veri.yolGideri) || 0)
  const sabitGider = (parseFloat(veri.kira) || 0) + (parseFloat(veri.elektrik) || 0) + (parseFloat(veri.su) || 0) + (parseFloat(veri.dogalgaz) || 0) + (parseFloat(veri.internet) || 0) + (parseFloat(veri.sarfMalzeme) || 0)
  const makineAmortisman = makineler.reduce((acc, m) => acc + Number(m.aylikAmortisman), 0)
  const aracMaliyet = araclar.reduce((acc, a) => acc + Number(a.aylikToplamSabitMaliyet), 0)
  const toplamAylikGider = personelGider + sabitGider + makineAmortisman + aracMaliyet
  const toplamAylikDakika = 26 * 8 * 60
  const dakikaMaliyeti = toplamAylikDakika > 0 ? toplamAylikGider / toplamAylikDakika : 0
  const gunlukGider = toplamAylikGider / 26

  const atolye = await prisma.atolye.upsert({
    where: { userId: auth.userId },
    update: {
      atolyeAdi: veri.atolyeAdi, sehir: veri.sehir, ilce: veri.ilce,
      telefon: veri.telefon || '', email: veri.email || '', adres: veri.adres || '',
        kurulusYili: parseInt(veri.kurulusYili) || 0,
      toplamMaas: parseFloat(veri.toplamMaas) || 0,
      sgkGideri: parseFloat(veri.sgkGideri) || 0,
      yemekGideri: parseFloat(veri.yemekGideri) || 0,
      yolGideri: parseFloat(veri.yolGideri) || 0,
      kira: parseFloat(veri.kira) || 0,
      elektrik: parseFloat(veri.elektrik) || 0,
      su: parseFloat(veri.su) || 0,
      dogalgaz: parseFloat(veri.dogalgaz) || 0,
      internet: parseFloat(veri.internet) || 0,
      sarfMalzeme: parseFloat(veri.sarfMalzeme) || 0,
      aylikPorselenPlaka: parseInt(veri.aylikPorselenPlaka) || 0,
      aylikKuvarsPlaka: parseInt(veri.aylikKuvarsPlaka) || 0,
      aylikDogaltasPlaka: parseInt(veri.aylikDogaltasPlaka) || 0,
      plakaBasinaMtul: normalizeMtulInput(veri.plakaBasinaMtul) || 3.20,
      kdvOrani: parseInt(veri.kdvOrani) || 20,
      teklifGecerlilik: parseInt(veri.teklifGecerlilik) || 15,
      dakikaMaliyeti,
    },
    create: {
      userId: auth.userId,
      atolyeAdi: veri.atolyeAdi || '', sehir: veri.sehir || '', ilce: veri.ilce || '',
      telefon: veri.telefon || '', email: veri.email || '', adres: veri.adres || '',
        kurulusYili: parseInt(veri.kurulusYili) || 0,
      toplamMaas: parseFloat(veri.toplamMaas) || 0,
      sgkGideri: parseFloat(veri.sgkGideri) || 0,
      yemekGideri: parseFloat(veri.yemekGideri) || 0,
      yolGideri: parseFloat(veri.yolGideri) || 0,
      kira: parseFloat(veri.kira) || 0,
      elektrik: parseFloat(veri.elektrik) || 0,
      su: parseFloat(veri.su) || 0,
      dogalgaz: parseFloat(veri.dogalgaz) || 0,
      internet: parseFloat(veri.internet) || 0,
      sarfMalzeme: parseFloat(veri.sarfMalzeme) || 0,
      aylikPorselenPlaka: parseInt(veri.aylikPorselenPlaka) || 0,
      aylikKuvarsPlaka: parseInt(veri.aylikKuvarsPlaka) || 0,
      aylikDogaltasPlaka: parseInt(veri.aylikDogaltasPlaka) || 0,
      plakaBasinaMtul: normalizeMtulInput(veri.plakaBasinaMtul) || 3.20,
      kdvOrani: parseInt(veri.kdvOrani) || 20,
      teklifGecerlilik: parseInt(veri.teklifGecerlilik) || 15,
      dakikaMaliyeti,
    },
  })

  return NextResponse.json({ atolye, toplamAylikGider, dakikaMaliyeti, gunlukGider })
}
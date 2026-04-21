import { NextRequest, NextResponse } from 'next/server'
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
  } catch {
    return null
  }
}

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
  const toplamPlaka = Number(atolye.aylikPorselenPlaka) + Number(atolye.aylikKuvarsPlaka) + Number(atolye.aylikDogaltasPlaka)
  const toplamAylikDakika = toplamPlaka * 480
  const dakikaMaliyeti = toplamAylikDakika > 0 ? toplamAylikGider / toplamAylikDakika : 0
  const gunlukGider = toplamAylikGider / 26
  return { toplamAylikGider, dakikaMaliyeti, gunlukGider }
}

export async function GET() {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({
    where: { userId: kullanici.id },
    include: { makineler: true, araclar: true }
  })

  if (!atolye) return NextResponse.json({ atolye: null, toplamAylikGider: 0, dakikaMaliyeti: 0, gunlukGider: 0 })

  const { toplamAylikGider, dakikaMaliyeti, gunlukGider } = toplamHesapla(atolye)
  return NextResponse.json({ atolye, toplamAylikGider, dakikaMaliyeti, gunlukGider })
}

export async function POST(req: NextRequest) {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const veri = await req.json()

  const mevcutAtoyle = await prisma.atolye.findUnique({
    where: { userId: kullanici.id },
    include: { makineler: true, araclar: true }
  })

  const makineler = mevcutAtoyle?.makineler || []
  const araclar = mevcutAtoyle?.araclar || []

  const personelGider = (parseFloat(veri.toplamMaas) || 0) + (parseFloat(veri.sgkGideri) || 0) + (parseFloat(veri.yemekGideri) || 0) + (parseFloat(veri.yolGideri) || 0)
  const sabitGider = (parseFloat(veri.kira) || 0) + (parseFloat(veri.elektrik) || 0) + (parseFloat(veri.su) || 0) + (parseFloat(veri.dogalgaz) || 0) + (parseFloat(veri.internet) || 0) + (parseFloat(veri.sarfMalzeme) || 0)
  const makineAmortisman = makineler.reduce((acc, m) => acc + Number(m.aylikAmortisman), 0)
  const aracMaliyet = araclar.reduce((acc, a) => acc + Number(a.aylikToplamSabitMaliyet), 0)
  const toplamAylikGider = personelGider + sabitGider + makineAmortisman + aracMaliyet
  const toplamPlaka = (parseInt(veri.aylikPorselenPlaka) || 0) + (parseInt(veri.aylikKuvarsPlaka) || 0) + (parseInt(veri.aylikDogaltasPlaka) || 0)
  const toplamAylikDakika = toplamPlaka * 480
  const dakikaMaliyeti = toplamAylikDakika > 0 ? toplamAylikGider / toplamAylikDakika : 0
  const gunlukGider = toplamAylikGider / 26

  const atolye = await prisma.atolye.upsert({
    where: { userId: kullanici.id },
    update: {
      atolyeAdi: veri.atolyeAdi, sehir: veri.sehir, ilce: veri.ilce,
      telefon: veri.telefon || '', email: veri.email || '', adres: veri.adres || '',
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
      plakaBasinaMtul: parseFloat(veri.plakaBasinaMtul) || 3.20,
      kdvOrani: parseInt(veri.kdvOrani) || 20,
      teklifGecerlilik: parseInt(veri.teklifGecerlilik) || 15,
      dakikaMaliyeti,
    },
    create: {
      userId: kullanici.id,
      atolyeAdi: veri.atolyeAdi || '', sehir: veri.sehir || '', ilce: veri.ilce || '',
      telefon: veri.telefon || '', email: veri.email || '', adres: veri.adres || '',
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
      plakaBasinaMtul: parseFloat(veri.plakaBasinaMtul) || 3.20,
      kdvOrani: parseInt(veri.kdvOrani) || 20,
      teklifGecerlilik: parseInt(veri.teklifGecerlilik) || 15,
      dakikaMaliyeti,
    },
  })

  return NextResponse.json({ atolye, toplamAylikGider, dakikaMaliyeti, gunlukGider })
}

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

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const kullanici = await kullaniciAl()
    if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

    const { id } = await context.params
    const body = await req.json()

    const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
    if (!atolye) return NextResponse.json({ hata: 'Atölye bulunamadı.' }, { status: 404 })

    const mevcut = await prisma.is.findFirst({
      where: { id, atolyeId: atolye.id },
      select: {
        id: true,
        metrajMtul: true,
        tezgahArasiMtul: true,
        adaTezgahMtul: true,
        toplamMaliyet: true,
      },
    })

    if (!mevcut) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })

    const tezgahMtul = Number(mevcut.metrajMtul || 0)
    const arasiMtul = Number(mevcut.tezgahArasiMtul || 0)
    const adaMtul = Number(mevcut.adaTezgahMtul || 0)

    const agirlikliMtul = tezgahMtul + arasiMtul * 0.75 + adaMtul * 1.5

    const satisFiyatiToplam = Number(body.satisFiyatiToplam || 0)

    const bazBirim = satisFiyatiToplam > 0 && agirlikliMtul > 0
      ? satisFiyatiToplam / agirlikliMtul
      : Number(body.tezgahBirimFiyatOverride || 0)

    const tezgah = bazBirim
    const arasi = bazBirim * 0.75
    const ada = bazBirim * 1.5

    const satisFiyati = satisFiyatiToplam > 0
      ? satisFiyatiToplam
      : tezgahMtul * tezgah + arasiMtul * arasi + adaMtul * ada

    const kdvOrani = Number(atolye.kdvOrani || 20)
    const kdvTutari = satisFiyati * (kdvOrani / 100)
    const kdvDahilFiyat = satisFiyati + kdvTutari
    const toplamMetraj =
      tezgahMtul + arasiMtul + adaMtul

    const mtulSatisFiyati = toplamMetraj > 0 ? satisFiyati / toplamMetraj : 0
    const karYuzdesi = Number(mevcut.toplamMaliyet || 0) > 0
      ? ((satisFiyati - Number(mevcut.toplamMaliyet || 0)) / Number(mevcut.toplamMaliyet || 0)) * 100
      : 0

    const guncel = await prisma.is.update({
      where: { id },
      data: {
        tezgahBirimFiyatOverride: tezgah,
        tezgahArasiBirimFiyatOverride: arasi,
        adaBirimFiyatOverride: ada,
        satisFiyati,
        kdvTutari,
        kdvDahilFiyat,
        mtulSatisFiyati,
        karYuzdesi,
        versiyon: { increment: 1 },
      },
    })

    return NextResponse.json({ ok: true, is: guncel })
  } catch (e: any) {
    return NextResponse.json({ hata: e.message || 'Fiyat kaydedilemedi.' }, { status: 500 })
  }
}

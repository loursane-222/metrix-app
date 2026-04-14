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
  } catch {
    return null
  }
}

export async function GET() {
  const kullanici = await kullaniciAl()
  if (!kullanici) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const atolye = await prisma.atolye.findUnique({ where: { userId: kullanici.id } })
  if (!atolye) return NextResponse.json({
    toplamIs: 0, onaylananIs: 0, kaybedilenIs: 0,
    teklifVerilenTutar: 0, onaylananTutar: 0, onaylanmaOrani: 0,
    toplamCiro: 0, toplamMaliyet: 0, toplamKar: 0
  })

  const isler = await prisma.is.findMany({ where: { atolyeId: atolye.id } })

  const toplamIs = isler.length
  const onaylananIs = isler.filter(i => i.durum === 'onaylandi').length
  const kaybedilenIs = isler.filter(i => i.durum === 'kaybedildi').length

  const teklifVerilenTutar = isler.reduce((acc, i) => acc + Number(i.satisFiyati), 0)
  const onaylananTutar = isler.filter(i => i.durum === 'onaylandi').reduce((acc, i) => acc + Number(i.satisFiyati), 0)
  const onaylanmaOrani = toplamIs > 0 ? (onaylananIs / toplamIs) * 100 : 0

  const toplamCiro = onaylananTutar
  const toplamMaliyet = isler.filter(i => i.durum === 'onaylandi').reduce((acc, i) => acc + Number(i.toplamMaliyet), 0)
  const toplamKar = toplamCiro - toplamMaliyet

  return NextResponse.json({
    toplamIs, onaylananIs, kaybedilenIs,
    teklifVerilenTutar, onaylananTutar, onaylanmaOrani,
    toplamCiro, toplamMaliyet, toplamKar
  })
}
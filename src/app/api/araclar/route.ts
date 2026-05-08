import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const araclar = await prisma.arac.findMany({ where: { atolyeId: atolyeId } })
  return NextResponse.json({ araclar })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { aracAdi, aracTipi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikBakim, aylikSigortaKasko, aylikVergiMuayene } = await req.json()

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const aylikToplamSabitMaliyet = aylikAmortisman + aylikBakim + aylikSigortaKasko + aylikVergiMuayene

  const arac = await prisma.arac.create({
    data: {
      atolyeId: atolyeId,
      aracAdi,
      aracTipi,
      alinanBedel,
      paraBirimi,
      amortismanSuresiAy,
      aylikBakim,
      aylikSigortaKasko,
      aylikVergiMuayene,
      aylikAmortisman,
      aylikToplamSabitMaliyet,
    },
  })

  return NextResponse.json({ arac })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id } = await req.json()
  await prisma.arac.delete({ where: { id } })
  return NextResponse.json({ tamam: true })
}
export async function PUT(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id, aracAdi, aracTipi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikBakim, aylikSigortaKasko, aylikVergiMuayene } = await req.json()

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const aylikToplamSabitMaliyet = aylikAmortisman + aylikBakim + aylikSigortaKasko + aylikVergiMuayene

  const arac = await prisma.arac.update({
    where: { id },
    data: { aracAdi, aracTipi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikBakim, aylikSigortaKasko, aylikVergiMuayene, aylikAmortisman, aylikToplamSabitMaliyet },
  })

  return NextResponse.json({ arac })
}

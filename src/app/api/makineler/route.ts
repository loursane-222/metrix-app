import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'



export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const makineler = await prisma.makine.findMany({ where: { atolyeId: atolyeId } })
  return NextResponse.json({ makineler })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { makineAdi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikAktifCalismaSaati } = await req.json()

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const saatlikMaliyet = aylikAmortisman / aylikAktifCalismaSaati
  const dakikalikMaliyet = saatlikMaliyet / 60

  const makine = await prisma.makine.create({
    data: {
      atolyeId: atolyeId,
      makineAdi,
      alinanBedel,
      paraBirimi,
      amortismanSuresiAy,
      aylikAktifCalismaSaati,
      aylikAmortisman,
      saatlikMaliyet,
      dakikalikMaliyet,
    },
  })

  return NextResponse.json({ makine })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id } = await req.json()
  await prisma.makine.delete({ where: { id } })
  return NextResponse.json({ tamam: true })
}
export async function PUT(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id, makineAdi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikAktifCalismaSaati } = await req.json()

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const saatlikMaliyet = aylikAktifCalismaSaati > 0 ? aylikAmortisman / aylikAktifCalismaSaati : 0
  const dakikalikMaliyet = saatlikMaliyet / 60

  const makine = await prisma.makine.update({
    where: { id },
    data: { makineAdi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikAktifCalismaSaati, aylikAmortisman, saatlikMaliyet, dakikalikMaliyet },
  })

  return NextResponse.json({ makine })
}

import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { notifyMachineCostChanged } from '@/lib/costingNotifications'


function sameNumber(a: unknown, b: unknown) {
  return Number(a || 0) === Number(b || 0)
}


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

  await notifyMachineCostChanged({
    atolyeId,
    userId: auth.role === 'admin' ? auth.userId : undefined,
    personelId: auth.personelId,
    machineId: makine.id,
    machineName: makine.makineAdi,
    action: 'created',
    amount: Number(makine.alinanBedel || 0),
    currency: makine.paraBirimi,
    newValue: {
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
  const atolyeId = auth.atolyeId

  const { id } = await req.json()
  const makine = await prisma.makine.findFirst({ where: { id, atolyeId } })
  if (!makine) return NextResponse.json({ hata: 'Makine bulunamadı.' }, { status: 404 })
  await prisma.makine.delete({ where: { id } })
  await notifyMachineCostChanged({
    atolyeId,
    userId: auth.role === 'admin' ? auth.userId : undefined,
    personelId: auth.personelId,
    machineId: makine.id,
    machineName: makine.makineAdi,
    action: 'deleted',
    amount: Number(makine.alinanBedel || 0),
    currency: makine.paraBirimi,
  })
  return NextResponse.json({ tamam: true })
}
export async function PUT(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { id, makineAdi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikAktifCalismaSaati } = await req.json()
  const mevcut = await prisma.makine.findFirst({ where: { id, atolyeId } })
  if (!mevcut) return NextResponse.json({ hata: 'Makine bulunamadı.' }, { status: 404 })

  const aylikAmortisman = alinanBedel / amortismanSuresiAy
  const saatlikMaliyet = aylikAktifCalismaSaati > 0 ? aylikAmortisman / aylikAktifCalismaSaati : 0
  const dakikalikMaliyet = saatlikMaliyet / 60

  const makine = await prisma.makine.update({
    where: { id },
    data: { makineAdi, alinanBedel, paraBirimi, amortismanSuresiAy, aylikAktifCalismaSaati, aylikAmortisman, saatlikMaliyet, dakikalikMaliyet },
  })

  const changed =
    mevcut.makineAdi !== makineAdi ||
    !sameNumber(mevcut.alinanBedel, alinanBedel) ||
    mevcut.paraBirimi !== paraBirimi ||
    !sameNumber(mevcut.amortismanSuresiAy, amortismanSuresiAy) ||
    !sameNumber(mevcut.aylikAktifCalismaSaati, aylikAktifCalismaSaati)

  if (changed) {
    await notifyMachineCostChanged({
      atolyeId,
      userId: auth.role === 'admin' ? auth.userId : undefined,
      personelId: auth.personelId,
      machineId: makine.id,
      machineName: makine.makineAdi,
      action: 'updated',
      amount: Number(makine.alinanBedel || 0),
      currency: makine.paraBirimi,
      oldValue: {
        makineAdi: mevcut.makineAdi,
        alinanBedel: mevcut.alinanBedel,
        paraBirimi: mevcut.paraBirimi,
        amortismanSuresiAy: mevcut.amortismanSuresiAy,
        aylikAktifCalismaSaati: mevcut.aylikAktifCalismaSaati,
      },
      newValue: {
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
  }

  return NextResponse.json({ makine })
}

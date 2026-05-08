import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'


export async function GET(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const musteriId = req.nextUrl.searchParams.get('musteriId')
  if (!musteriId) return NextResponse.json({ hata: 'musteriId gerekli.' }, { status: 400 })
    const musteri = await prisma.musteri.findFirst({ where: { id: musteriId, atolyeId: atolyeId } })
  if (!musteri) return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })
  const tahsilatlar = await prisma.tahsilat.findMany({
    where: { musteriId },
    include: {
      is: { select: { id: true, teklifNo: true, urunAdi: true, satisFiyati: true } }
    },
    orderBy: { tarih: 'desc' }
  })
  return NextResponse.json({ tahsilatlar })
}

export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const body = await req.json()
  const musteriId = String(body.musteriId || '').trim()
  const tutar = Number(body.tutar || 0)
  const tarih = body.tarih ? new Date(body.tarih) : new Date()
  const isId = body.isId ? String(body.isId).trim() : null

  if (!musteriId) return NextResponse.json({ hata: 'musteriId gerekli.' }, { status: 400 })
  if (tutar <= 0) return NextResponse.json({ hata: 'Tutar 0\'dan büyük olmalı.' }, { status: 400 })

  const musteri = await prisma.musteri.findFirst({ where: { id: musteriId, atolyeId: atolyeId } })
  if (!musteri) return NextResponse.json({ hata: 'Müşteri bulunamadı.' }, { status: 404 })

  // isId verilmişse doğrula
  if (isId) {
    const is = await prisma.is.findFirst({ where: { id: isId, musteriId, atolyeId: atolyeId } })
    if (!is) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })
  }

  const tahsilat = await prisma.tahsilat.create({
    data: { musteriId, tutar, tarih, isId },
    include: { is: { select: { id: true, teklifNo: true, urunAdi: true, satisFiyati: true } } }
  })
  return NextResponse.json({ tahsilat })
}

export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ hata: 'id gerekli.' }, { status: 400 })
  const tahsilat = await prisma.tahsilat.findFirst({ where: { id }, include: { musteri: true } })
  if (!tahsilat || tahsilat.musteri.atolyeId !== atolyeId) return NextResponse.json({ hata: 'Tahsilat bulunamadı.' }, { status: 404 })
  await prisma.tahsilat.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

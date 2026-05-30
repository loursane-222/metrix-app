import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server'
import { isStockReservationReleaseBlocked, releaseOpenReservationsForJob } from "@/lib/stock/reservations";


export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth()
    if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
    const atolyeId = auth.atolyeId

    const { id, durum, tasDurumu, tahsilat } = await req.json()
    if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 })

    const mevcutIs = await prisma.is.findFirst({ where: { id, atolyeId } })
    if (!mevcutIs) return NextResponse.json({ hata: 'İş bulunamadı.' }, { status: 404 })

    const data: Record<string, unknown> = { durum }

    if (durum === 'onaylandi') {
      data.onaylanmaTarihi = new Date()
      data.kaybedilmeTarihi = null
    } else if (durum === 'kaybedildi') {
      data.kaybedilmeTarihi = new Date()
      data.onaylanmaTarihi = null
    } else if (durum === 'teklif_verildi') {
      data.onaylanmaTarihi = null
      data.kaybedilmeTarihi = null
    }

    if (tasDurumu !== undefined) data.tasDurumu = tasDurumu
    if (tahsilat !== undefined) data.tahsilat = parseFloat(String(tahsilat)) || 0

    const is = await prisma.$transaction(async (tx) => {
      const job = await tx.is.update({
        where: { id },
        data,
      })

      if (durum === 'kaybedildi') {
        await releaseOpenReservationsForJob(tx, { atolyeId, isId: id })
      }

      return job
    })

    return NextResponse.json({ is })
  } catch (error: any) {
    if (isStockReservationReleaseBlocked(error)) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || "İş durumu güncellenemedi" }, { status: 500 })
  }
}

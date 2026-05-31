import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activityLogger'
import {
  getNotificationEventConfig,
  NotificationEventType,
  shouldAwaitPushForEvent,
} from '@/lib/notificationCatalog'
import { NextRequest, NextResponse } from 'next/server'

const kategoriler = ['toplamMaas','sgkGideri','yemekGideri','yolGideri','kira','elektrik','su','dogalgaz','internet','sarfMalzeme','diger']

const kategoriLabel: Record<string, string> = {
  toplamMaas: 'Toplam Maaş',
  sgkGideri: 'SGK Gideri',
  yemekGideri: 'Yemek Gideri',
  yolGideri: 'Yol Gideri',
  kira: 'Kira',
  elektrik: 'Elektrik',
  su: 'Su',
  dogalgaz: 'Doğalgaz',
  internet: 'İnternet',
  sarfMalzeme: 'Sarf Malzeme',
  diger: 'Diğer',
}

const kolonMap: Record<string, string> = {
  toplamMaas: 'toplamMaas',
  sgkGideri: 'sgkGideri',
  yemekGideri: 'yemekGideri',
  yolGideri: 'yolGideri',
  kira: 'kira',
  elektrik: 'elektrik',
  su: 'su',
  dogalgaz: 'dogalgaz',
  internet: 'internet',
  sarfMalzeme: 'sarfMalzeme',
}

function formatMoney(amount: number) {
  return `${Math.round(amount).toLocaleString('tr-TR')} TL`
}

async function getExpenseStats(atolyeId: string) {
  const giderler = await prisma.$queryRawUnsafe(`
    SELECT * FROM "AylikGider" WHERE "atolyeId" = $1 ORDER BY tarih DESC
  `, atolyeId) as any[]

  const ortalamalar: Record<string, number> = {}
  const toplamlar: Record<string, number> = {}

  for (const kat of kategoriler) {
    const rows = giderler.filter((g: any) => g.kategori === kat)
    const toplam = rows.reduce((acc: number, g: any) => acc + Number(g.tutar), 0)
    toplamlar[kat] = Math.round(toplam)
    if (rows.length > 0) {
      ortalamalar[kat] = Math.round(toplam / rows.length)
    }
  }

  return { giderler, ortalamalar, toplamlar }
}

async function syncAtolyeExpenseTotals(atolyeId: string) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT kategori, SUM(tutar::numeric) as toplam FROM "AylikGider"
    WHERE "atolyeId" = $1 GROUP BY kategori
  `, atolyeId) as any[]

  const guncelle = Object.fromEntries(Object.values(kolonMap).map((column) => [column, 0])) as Record<string, number>

  for (const r of rows) {
    if (kolonMap[r.kategori]) {
      guncelle[kolonMap[r.kategori]] = Math.round(Number(r.toplam))
    }
  }

  await prisma.atolye.update({ where: { id: atolyeId }, data: guncelle })
}

async function notifyWorkshopExpenseChanged(params: {
  atolyeId: string
  userId: string
  expenseId: string
  expenseType: string
  description: string
  amount: number
  action: 'eklendi' | 'silindi'
}) {
  const eventType = NotificationEventType.COSTING.WORKSHOP_COST_CHANGED
  const eventConfig = getNotificationEventConfig(eventType)
  const pushAwaited = shouldAwaitPushForEvent(eventType)
  const label = kategoriLabel[params.expenseType] || params.expenseType

  await logActivity({
    atolyeId: params.atolyeId,
    userId: params.userId,
    type: eventType,
    eventType,
    category: eventConfig.category,
    severity: eventConfig.severity,
    source: 'workshop-cost',
    title: eventConfig.defaultTitle,
    message: `Atölye gideri ${params.action}: ${label}${params.description ? ` — ${params.description}` : ''}, ${formatMoney(params.amount)}`,
    refId: params.expenseId,
    refType: 'workshop_expense',
    url: '/dashboard/atolye?tab=giderler',
    metadata: {
      eventType,
      category: eventConfig.category,
      expenseId: params.expenseId,
      expenseType: params.expenseType,
      description: params.description,
      amount: params.amount,
      source: 'workshop-cost',
      notificationPipelineVersion: 'N1C',
      pushAwaited,
    },
    awaitPush: pushAwaited,
  })
}

// GET — tüm giderler + kategori ortalamaları/toplamları
export async function GET() {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { giderler, ortalamalar, toplamlar } = await getExpenseStats(auth.atolyeId)
  return NextResponse.json({ giderler, ortalamalar, toplamlar })
}

// POST — yeni gider kaydet
export async function POST(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })
  const atolyeId = auth.atolyeId

  const { tarih, kategori, aciklama, tutar } = await req.json()
  if (!tarih || !kategori || !tutar) return NextResponse.json({ hata: 'Eksik alan' }, { status: 400 })

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
  const description = aciklama || ''
  const amount = Number(tutar)

  await prisma.$executeRawUnsafe(`
    INSERT INTO "AylikGider" (id, "atolyeId", tarih, kategori, aciklama, tutar, "createdAt")
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `, id, atolyeId, new Date(tarih), kategori, description, amount)

  await syncAtolyeExpenseTotals(atolyeId)
  await notifyWorkshopExpenseChanged({
    atolyeId,
    userId: auth.userId,
    expenseId: id,
    expenseType: kategori,
    description,
    amount,
    action: 'eklendi',
  })

  return NextResponse.json({ ok: true, id })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const auth = await getAtolyeAuth()
  if (!auth) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ hata: 'ID gerekli' }, { status: 400 })

  const rows = await prisma.$queryRawUnsafe(`
    SELECT * FROM "AylikGider" WHERE id = $1 AND "atolyeId" = $2 LIMIT 1
  `, id, auth.atolyeId) as any[]
  const gider = rows[0]
  if (!gider) return NextResponse.json({ hata: 'Gider bulunamadı.' }, { status: 404 })

  await prisma.$executeRawUnsafe(`DELETE FROM "AylikGider" WHERE id = $1 AND "atolyeId" = $2`, id, auth.atolyeId)
  await syncAtolyeExpenseTotals(auth.atolyeId)
  await notifyWorkshopExpenseChanged({
    atolyeId: auth.atolyeId,
    userId: auth.userId,
    expenseId: id,
    expenseType: gider.kategori,
    description: gider.aciklama || '',
    amount: Number(gider.tutar),
    action: 'silindi',
  })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'admin@metrix.com'

async function adminKontrol() {
  const cookieStore = await cookies()
  const token = cookieStore.get('metrix-token')?.value
  if (!token) return null
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'metrix-gizli-anahtar-2024')
    const { payload } = await jwtVerify(token, secret)
    const kullanici = payload as { id: string; email: string }
    if (kullanici.email !== ADMIN_EMAIL) return null
    return kullanici
  } catch {
    return null
  }
}

export async function GET() {
  const admin = await adminKontrol()
  if (!admin) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const kullanicilar = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      ad: true,
      aktif: true,
      abonelikBitis: true,
      createdAt: true,
      atolye: { select: { atolyeAdi: true } }
    }
  })

  return NextResponse.json({ kullanicilar })
}

export async function POST(req: NextRequest) {
  const admin = await adminKontrol()
  if (!admin) return NextResponse.json({ hata: 'Yetkisiz.' }, { status: 401 })

  const { kullaniciId, islem, ay } = await req.json()

  if (islem === 'abonelikUzat') {
    const kullanici = await prisma.user.findUnique({ where: { id: kullaniciId } })
    if (!kullanici) return NextResponse.json({ hata: 'Kullanıcı bulunamadı.' }, { status: 404 })

    const baslangic = kullanici.abonelikBitis && new Date(kullanici.abonelikBitis) > new Date()
      ? new Date(kullanici.abonelikBitis)
      : new Date()

    const yeniBitis = new Date(baslangic)
    yeniBitis.setMonth(yeniBitis.getMonth() + (ay || 1))

    await prisma.user.update({
      where: { id: kullaniciId },
      data: { abonelikBitis: yeniBitis, aktif: true }
    })

    return NextResponse.json({ mesaj: 'Abonelik uzatıldı.' })
  }

  if (islem === 'durumDegistir') {
    const kullanici = await prisma.user.findUnique({ where: { id: kullaniciId } })
    if (!kullanici) return NextResponse.json({ hata: 'Kullanıcı bulunamadı.' }, { status: 404 })

    await prisma.user.update({
      where: { id: kullaniciId },
      data: { aktif: !kullanici.aktif }
    })

    return NextResponse.json({ mesaj: 'Durum güncellendi.' })
  }

  if (islem === 'sil') {
    // Önce kullanıcının atölyesini bul
    const kullanici = await prisma.user.findUnique({
      where: { id: kullaniciId },
      include: { atolye: true }
    })
    
    if (kullanici?.atolye) {
      const atolyeId = kullanici.atolye.id
      
      // İşlemlere bağlı operasyonları sil
      const isler = await prisma.is.findMany({ where: { atolyeId } })
      for (const is of isler) {
        await prisma.isOperasyon.deleteMany({ where: { isId: is.id } })
      }
      
      // İş programlarını sil
      for (const is of isler) {
        const ws = await prisma.workSchedule.findUnique({ where: { isId: is.id } })
        if (ws) {
          await prisma.schedulePhase.deleteMany({ where: { workScheduleId: ws.id } })
          await prisma.workSchedule.delete({ where: { id: ws.id } })
        }
      }
      
      // İşleri sil
      await prisma.is.deleteMany({ where: { atolyeId } })
      
      // Makineleri ve araçları sil
      await prisma.makine.deleteMany({ where: { atolyeId } })
      await prisma.arac.deleteMany({ where: { atolyeId } })
      
      // Atölyeyi sil
      await prisma.atolye.delete({ where: { id: atolyeId } })
    }
    
    // Kullanıcıyı sil
    await prisma.user.delete({ where: { id: kullaniciId } })
    return NextResponse.json({ mesaj: 'Kullanıcı silindi.' })
  }

  return NextResponse.json({ hata: 'Geçersiz işlem.' }, { status: 400 })
}
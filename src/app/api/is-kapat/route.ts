import { prisma } from "@/lib/prisma";
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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

function odemePlanOlustur(musteriTipi: string, toplamTutar: number, onayTarihi: Date) {
  const taksitler: { taksitNo: number; aciklama: string; yuzdesi: number; gunSonra: number }[] = []

  if (musteriTipi === 'bayi') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%30)', yuzdesi: 30, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'Teslimatta (%70)', yuzdesi: 70, gunSonra: 30 })
  } else if (musteriTipi === 'mimar') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%25)', yuzdesi: 25, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%25)', yuzdesi: 25, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslimatta (%50)', yuzdesi: 50, gunSonra: 30 })
  } else if (musteriTipi === 'muteahhit') {
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%20)', yuzdesi: 20, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'İmalat başlangıcı (%30)', yuzdesi: 30, gunSonra: 15 })
    taksitler.push({ taksitNo: 3, aciklama: 'Teslim + 30 gün (%50)', yuzdesi: 50, gunSonra: 45 })
  } else {
    // son_kullanici (default)
    taksitler.push({ taksitNo: 1, aciklama: 'Peşinat (%50)', yuzdesi: 50, gunSonra: 0 })
    taksitler.push({ taksitNo: 2, aciklama: 'Teslimatta (%50)', yuzdesi: 50, gunSonra: 30 })
  }

  return taksitler.map(t => ({
    taksitNo: t.taksitNo,
    aciklama: t.aciklama,
    tutar: Math.round((toplamTutar * t.yuzdesi) / 100 * 100) / 100,
    vadeTarihi: new Date(onayTarihi.getTime() + t.gunSonra * 24 * 60 * 60 * 1000)
  }))
}

export async function POST(req: Request) {
  try {
    const { id, fiyat } = await req.json()

    if (!id) return Response.json({ error: 'ID gerekli' }, { status: 400 })

    const onayTarihi = new Date()

    const updated = await prisma.is.update({
      where: { id },
      data: {
        durum: 'onaylandi',
        satisFiyati: String(fiyat || 0),
        onaylanmaTarihi: onayTarihi,
      },
      include: { musteri: true }
    })

    // Müşteri varsa ve fiyat > 0 ise otomatik ödeme planı oluştur
    if (updated.musteriId && updated.musteri && Number(fiyat || 0) > 0) {
      const mevcutPlan = await prisma.odemePlani.findUnique({ where: { isId: id } })

      if (!mevcutPlan) {
        const musteriTipi = updated.musteri.musteriTipi || 'son_kullanici'
        const toplamTutar = Number(fiyat || 0)
        const taksitVerileri = odemePlanOlustur(musteriTipi, toplamTutar, onayTarihi)

        await prisma.odemePlani.create({
          data: {
            isId: id,
            musteriId: updated.musteriId,
            toplamTutar,
            musteriTipi,
            taksitler: { create: taksitVerileri }
          }
        })
      }
    }

    return Response.json({ ok: true, data: updated })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

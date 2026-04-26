import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { id, durum, fiyat, tasDurumu } = await req.json();

    if (!id) {
      return Response.json({ error: "ID gerekli" }, { status: 400 });
    }

    const data: any = { durum };

    if (fiyat !== undefined) {
      data.satisFiyati = String(fiyat || 0);
    }

    if (tasDurumu !== undefined) {
      data.tasDurumu = tasDurumu || null;
    }

    if (durum === "onaylandi") {
      data.onaylanmaTarihi = new Date();
      data.kaybedilmeTarihi = null;
    }

    if (durum === "kaybedildi") {
      data.kaybedilmeTarihi = new Date();
      data.onaylanmaTarihi = null;
    }

    if (durum === "teklif_verildi") {
      data.onaylanmaTarihi = null;
      data.kaybedilmeTarihi = null;
    }

    const updated = await prisma.is.update({
      where: { id },
      data,
    });

    return Response.json({ ok: true, data: updated });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

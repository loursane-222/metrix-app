import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth) return Response.json({ error: "Yetkisiz." }, { status: 401 });
    const atolyeId = auth.atolyeId;

    const { searchParams } = new URL(req.url);
    const sadeceBorclu = searchParams.get("borclu") === "1";

    if (sadeceBorclu) {
      // Ödenmemiş taksiti olan müşterileri getir
      const planlar = await prisma.odemePlani.findMany({
        where: {
          musteri: { atolyeId },
          taksitler: { some: { odendiMi: false } },
        },
        select: {
          musteriId: true,
          toplamTutar: true,
          taksitler: {
            select: { tutar: true, odendiMi: true },
          },
          musteri: {
            select: {
              id: true,
              firmaAdi: true,
              ad: true,
              soyad: true,
              telefon: true,
              musteriTipi: true,
            },
          },
        },
      });

      // Müşteri başına borç hesapla
      const musteriMap = new Map<string, any>();
      for (const plan of planlar) {
        const m = plan.musteri;
        const toplam = Number(plan.toplamTutar);
        const odenen = plan.taksitler
          .filter((t) => t.odendiMi)
          .reduce((s, t) => s + Number(t.tutar), 0);
        const kalan = toplam - odenen;
        if (kalan <= 0) continue;

        if (!musteriMap.has(m.id)) {
          musteriMap.set(m.id, {
            id: m.id,
            ad: [m.firmaAdi, m.ad, m.soyad].filter(Boolean).join(" ").trim() || "İsimsiz",
            telefon: m.telefon || "",
            musteriTipi: m.musteriTipi || "son_kullanici",
            kalanBorc: 0,
          });
        }
        musteriMap.get(m.id).kalanBorc += kalan;
      }

      const musteriler = Array.from(musteriMap.values()).sort(
        (a, b) => b.kalanBorc - a.kalanBorc
      );

      return Response.json({ musteriler });
    }

    // Tüm müşteriler (arama için)
    const musteriler = await prisma.musteri.findMany({
      where: { atolyeId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        firmaAdi: true,
        ad: true,
        soyad: true,
        telefon: true,
        musteriTipi: true,
      },
    });

    return Response.json({
      musteriler: musteriler.map((m) => ({
        id: m.id,
        ad: [m.firmaAdi, m.ad, m.soyad].filter(Boolean).join(" ").trim() || "İsimsiz müşteri",
        telefon: m.telefon || "",
        musteriTipi: m.musteriTipi || "son_kullanici",
      })),
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const musteriler = await prisma.musteri.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        firmaAdi: true,
        ad: true,
        soyad: true,
        telefon: true,
        email: true,
      },
    });

    return Response.json({
      musteriler: musteriler.map((m) => ({
        id: m.id,
        ad: [m.firmaAdi, m.ad, m.soyad].filter(Boolean).join(" ").trim() || "İsimsiz müşteri",
        telefon: m.telefon || "",
        email: m.email || "",
      })),
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

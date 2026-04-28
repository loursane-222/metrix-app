import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const isler = await prisma.is.findMany({
      where: {
        durum: "onaylandi",
        whatsappOnay: true,
        whatsappOnayOkundu: false,
        workSchedule: null,
      },
      orderBy: { onaylanmaTarihi: "desc" },
      take: 30,
      select: {
        id: true,
        teklifNo: true,
        musteriAdi: true,
        urunAdi: true,
        malzemeTipi: true,
        satisFiyati: true,
        kdvDahilFiyat: true,
        onaylanmaTarihi: true,
        tasDurumu: true,
      },
    });

    return NextResponse.json({ isler });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

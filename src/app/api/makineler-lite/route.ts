import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const makineler = await prisma.makine.findMany({
      orderBy: { createdAt: "desc" }
    });

    // Güvenli dönüşüm
    const temiz = makineler.map((m) => ({
      id: m.id,
      makineAdi: m.makineAdi,
      dakikalikMaliyet: Number(m.dakikalikMaliyet) || 0,
      // DEBUG için ekliyoruz:
      tumVeri: m
    }));

    return NextResponse.json({ makineler: temiz });

  } catch (error) {
    console.error("MAKINE API HATA:", error);
    return NextResponse.json(
      { error: "Makine verisi alınamadı" },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teklifNo: string }> }
) {
  const { teklifNo } = await context.params;
  const is = await prisma.is.findFirst({
    where: { teklifNo },
    select: { musteriAdi: true, kdvDahilFiyat: true, satisFiyati: true },
  });
  if (!is) return NextResponse.json({ hata: "bulunamadı" }, { status: 404 });
  return NextResponse.json({
    musteriAdi: is.musteriAdi,
    toplamTutar: Number(is.kdvDahilFiyat || is.satisFiyati || 0),
  });
}

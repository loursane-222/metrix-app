import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const tasDurumu = String(body?.tasDurumu || "");

    if (!["stokta", "alinacak"].includes(tasDurumu)) {
      return NextResponse.json({ hata: "Geçersiz taş durumu." }, { status: 400 });
    }

    const is = await prisma.is.update({
      where: { id },
      data: {
        tasDurumu,
        whatsappOnayOkundu: true,
      },
      select: {
        id: true,
        teklifNo: true,
        musteriAdi: true,
        urunAdi: true,
        tasDurumu: true,
      },
    });

    return NextResponse.json({ ok: true, is });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

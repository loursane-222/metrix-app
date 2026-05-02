import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createNotificationSafe } from "@/lib/notifications";
import { PrismaClient } from "@prisma/client";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teklifNo: string }> }
) {
  try {
    const { teklifNo } = await context.params;

    const is = await prisma.is.findFirst({
      where: { teklifNo },
      select: { id: true, durum: true },
    });

    if (!is) {
      return NextResponse.redirect(new URL(`/teklif/${teklifNo}?hata=bulunamadi`, req.url), 303);
    }

    await prisma.is.update({
      where: { id: is.id },
      data: {
        durum: "onaylandi",
        onaylanmaTarihi: new Date(),
        whatsappOnay: true,
        whatsappOnayOkundu: false,
      },
    });

    await createNotificationSafe({
      type: "ACTION",
      title: "Müşteri teklifi onayladı",
      description: "Onaylanan teklif için ölçü ve taş stok sürecini kontrol edin.",
      actionUrl: "/isler",
    });

    return NextResponse.redirect(new URL(`/teklif/${teklifNo}/tesekkur`, req.url), 303);
  } catch (e) {
    console.error("ONLINE TEKLIF ONAY HATASI:", e);
    return NextResponse.redirect(new URL(`/teklif/hata`, req.url), 303);
  }
}

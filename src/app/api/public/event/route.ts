import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { teklifNo, event, meta } = body;

    if (!teklifNo || !event) {
      return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
    }

    await prisma.teklifEvent.create({
      data: {
        teklifNo,
        event,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });

    // Ilgili isi bul ve activity log at
    try {
      const is = await prisma.is.findFirst({
        where: { teklifNo },
        select: { id: true, musteriAdi: true, atolyeId: true, teklifGoruntulenmeSayisi: true },
      });

      if (is?.atolyeId) {
        if (event === "goruntulendi") {
          const sayi = Number(is.teklifGoruntulenmeSayisi || 0) + 1;
          await logActivity({
            atolyeId: is.atolyeId,
            type: "teklif_goruntulendi",
            message: (is.musteriAdi || "Musteri") + " – " + teklifNo + " teklifini acti. (" + sayi + ". gorunum)",
            refId: is.id,
          });
        } else if (event === "pdf_acildi" || event === "pdf_acildi_server") {
          await logActivity({
            atolyeId: is.atolyeId,
            type: "teklif_pdf_acildi",
            message: (is.musteriAdi || "Musteri") + " – " + teklifNo + " PDF teklifini acti.",
            refId: is.id,
          });
        }
      }
    } catch {}

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("event error:", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}

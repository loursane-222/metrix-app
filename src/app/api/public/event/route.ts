import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyProposalSmallEvent } from "@/lib/proposalNotifications";

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
        select: { id: true, musteriId: true, musteriAdi: true, atolyeId: true, teklifNo: true, teklifGoruntulenmeSayisi: true },
      });

      if (is?.atolyeId) {
        if (event === "goruntulendi") {
          const sayi = Number(is.teklifGoruntulenmeSayisi || 0) + 1;
          await notifyProposalSmallEvent({
            job: is,
            action: "viewed",
            source: "public-proposal",
            viewCount: sayi,
            metadata: {
              publicEvent: event,
              eventMeta: meta ?? null,
            },
          });
        } else if (event === "pdf_acildi" || event === "pdf_acildi_server") {
          await notifyProposalSmallEvent({
            job: is,
            action: "pdf_opened",
            source: "public-proposal",
            metadata: {
              publicEvent: event,
              eventMeta: meta ?? null,
            },
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

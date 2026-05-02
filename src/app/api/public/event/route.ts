import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("event error:", e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}

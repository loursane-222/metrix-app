import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ hata: "Eksik bilgi." }, { status: 400 });

    const record = await prisma.emailVerification.findFirst({
      where: { email, code },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return NextResponse.json({ hata: "Kod hatalı." }, { status: 400 });
    if (record.expiresAt < new Date()) return NextResponse.json({ hata: "Kodun süresi doldu. Yeniden deneyin." }, { status: 400 });

    await prisma.emailVerification.deleteMany({ where: { email } });
    return NextResponse.json({ dogrulandi: true });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

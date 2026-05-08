import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { personelId, atolyeId, token } = await req.json();

  if (!personelId || !atolyeId || !token) {
    return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
  }

  await prisma.personelPushToken.upsert({
    where: { token },
    update: { personelId, atolyeId },
    create: { personelId, atolyeId, token },
  });

  return NextResponse.json({ ok: true });
}

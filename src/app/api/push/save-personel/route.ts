import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const auth = await getAtolyeAuth();
  if (!auth?.atolyeId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { personelId, token } = await req.json();

  if (!personelId || !token) {
    return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
  }

  // Verify personelId exists and belongs to the authenticated atölye
  const personel = await prisma.personel.findFirst({
    where: { id: personelId, atolyeId: auth.atolyeId },
    select: { id: true },
  });

  if (!personel) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  await prisma.personelPushToken.upsert({
    where: { token },
    update: { personelId, atolyeId: auth.atolyeId },
    create: { personelId, atolyeId: auth.atolyeId, token },
  });

  return NextResponse.json({ ok: true });
}

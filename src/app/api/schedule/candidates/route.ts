import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@/lib/env";

async function ownerAtolyeIdAl() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    return user?.atolye?.id || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const atolyeId = await ownerAtolyeIdAl();
  if (!atolyeId) {
    return NextResponse.json({ error: "Sadece ana hesap yeni iş oluşturabilir" }, { status: 403 });
  }

  const jobs = await prisma.is.findMany({
    where: {
      atolyeId,
      workSchedule: null,
      OR: [
        { whatsappOnay: true },
        { durum: "onaylandi" },
        { durum: "onaylandı" },
        { durum: "ONAYLANDI" },
        { durum: "whatsapp_onayli" },
        { durum: "whatsapp_onaylı" },
      ],
    },
    select: {
      id: true,
      teklifNo: true,
      musteriAdi: true,
      urunAdi: true,
      durum: true,
      whatsappOnay: true,
      createdAt: true,
      toplamSureDakika: true,
      satisFiyati: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(jobs);
}

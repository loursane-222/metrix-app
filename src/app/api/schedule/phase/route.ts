import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function authContextAl() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    if (!user) return null;

    if (user.atolye?.id) {
      return {
        atolyeId: user.atolye.id,
        isOwner: true,
        personelId: null as string | null,
      };
    }

    const personel = await prisma.personel.findFirst({
      where: { email: user.email, aktif: true },
      select: { id: true, atolyeId: true },
    });

    if (!personel) return null;

    return {
      atolyeId: personel.atolyeId,
      isOwner: false,
      personelId: personel.id,
    };
  } catch {
    return null;
  }
}

function dateOnlyToUtc(dateText: string) {
  return new Date(`${dateText}T00:00:00.000Z`);
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authContextAl();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const body = await req.json();
    const phaseId = String(body.phaseId || "");
    const plannedDate = String(body.plannedDate || "");

    if (!phaseId || !plannedDate) {
      return NextResponse.json(
        { error: "Eksik bilgi: phaseId veya plannedDate yok" },
        { status: 400 }
      );
    }

    const phase = await prisma.schedulePhase.findUnique({
      where: { id: phaseId },
      include: {
        fazAtamalar: true,
        workSchedule: {
          include: {
            is: true,
          },
        },
      },
    });

    if (!phase) {
      return NextResponse.json({ error: "Aşama bulunamadı" }, { status: 404 });
    }

    if (phase.workSchedule.is.atolyeId !== auth.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    if (!auth.isOwner) {
      const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === auth.personelId);
      if (!atanmisMi) {
        return NextResponse.json(
          { error: "Sadece size atanmış işleri taşıyabilirsiniz" },
          { status: 403 }
        );
      }
    }

    const nextDate = dateOnlyToUtc(plannedDate);

    const shouldMoveEnd =
      !phase.plannedEnd ||
      !phase.plannedStart ||
      phase.plannedEnd.toISOString().slice(0, 10) ===
        phase.plannedStart.toISOString().slice(0, 10);

    const updated = await prisma.schedulePhase.update({
      where: { id: phaseId },
      data: {
        plannedStart: nextDate,
        ...(shouldMoveEnd ? { plannedEnd: nextDate } : {}),
      },
    });

    return NextResponse.json({ ok: true, phase: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Aşama tarihi güncellenemedi" },
      { status: 500 }
    );
  }
}

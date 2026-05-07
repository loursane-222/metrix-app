import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function authContextAl() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "metrix-gizli-anahtar-2024");
    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    if (!user) return null;

    if (user.atolye?.id) {
      return { atolyeId: user.atolye.id, isOwner: true, personelId: null as string | null };
    }

    const personel = await prisma.personel.findFirst({
      where: { email: user.email, aktif: true },
      select: { id: true, atolyeId: true },
    });

    if (!personel) return null;
    return { atolyeId: personel.atolyeId, isOwner: false, personelId: personel.id };
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
    if (!auth?.atolyeId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await req.json();
    const phaseId = String(body.phaseId || "");
    const plannedDate = String(body.plannedDate || "");
    const notes = typeof body.notes === "string" ? body.notes : undefined;
    const personelIds = Array.isArray(body.personelIds)
      ? Array.from(new Set(body.personelIds.map((x: any) => String(x)).filter(Boolean)))
      : null;

    if (!phaseId) return NextResponse.json({ error: "phaseId gerekli" }, { status: 400 });

    const phase = await prisma.schedulePhase.findUnique({
      where: { id: phaseId },
      include: {
        fazAtamalar: true,
        workSchedule: { include: { is: true } },
      },
    });

    if (!phase) return NextResponse.json({ error: "Aşama bulunamadı" }, { status: 404 });
    if (phase.workSchedule.is.atolyeId !== auth.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
    }

    if (!auth.isOwner) {
      const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === auth.personelId);
      if (!atanmisMi) {
        return NextResponse.json({ error: "Sadece size atanmış işi düzenleyebilirsiniz" }, { status: 403 });
      }
      if (personelIds !== null) {
        return NextResponse.json({ error: "Personel atamasını sadece yönetici değiştirebilir" }, { status: 403 });
      }
    }

    const nextDate = plannedDate ? dateOnlyToUtc(plannedDate) : null;

    await prisma.$transaction(async (tx) => {
      if (nextDate) {
        await tx.schedulePhase.update({
          where: { id: phaseId },
          data: {
            plannedStart: nextDate,
            plannedEnd: nextDate,
          },
        });

        if (phase.phase === "OLCU") {
          await tx.workSchedule.update({
            where: { id: phase.workScheduleId },
            data: { startDate: nextDate },
          });
        }

        if (phase.phase === "MONTAJ") {
          await tx.workSchedule.update({
            where: { id: phase.workScheduleId },
            data: { endDate: nextDate },
          });
        }
      }

      if (notes !== undefined) {
        await tx.workSchedule.update({
          where: { id: phase.workScheduleId },
          data: { notes },
        });
      }

      if (personelIds !== null) {
        const valid = await tx.personel.findMany({
          where: { id: { in: personelIds }, atolyeId: auth.atolyeId, aktif: true },
          select: { id: true },
        });

        const validIds = valid.map((p) => p.id);

        await tx.fazAtama.deleteMany({ where: { schedulePhaseId: phaseId } });

        if (validIds.length) {
          await tx.fazAtama.createMany({
            data: validIds.map((personelId) => ({ schedulePhaseId: phaseId, personelId })),
          });
        }
      }
    });

    const updated = await prisma.schedulePhase.findUnique({
      where: { id: phaseId },
      include: {
        fazAtamalar: { include: { personel: { select: { id: true, ad: true, soyad: true, gorevi: true } } } },
        workSchedule: true,
      },
    });

    return NextResponse.json({ ok: true, phase: updated });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Faz güncellenemedi" }, { status: 500 });
  }
}

import { getAtolyeAuth } from '@/lib/getAtolyeId'
import { prisma } from "@/lib/prisma";
import { notifySchedulePhaseDateChanged } from "@/lib/schedulePhaseNotifications";
import { NextRequest, NextResponse } from "next/server";


function dateOnlyToUtc(dateText: string) {
  return new Date(`${dateText}T00:00:00.000Z`);
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    const isOwner = auth?.role === "admin";
    const personelId = auth?.personelId || null;
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

    if (!isOwner) {
      const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === personelId);
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

    const isAdi = phase.workSchedule.is.musteriAdi || phase.workSchedule.is.urunAdi || 'İş'
    await notifySchedulePhaseDateChanged({
      atolyeId: auth.atolyeId,
      userId: auth.userId,
      personelId: auth.personelId || null,
      source: "phase-route",
      phaseId,
      phaseType: phase.phase,
      workScheduleId: phase.workScheduleId,
      jobName: isAdi,
      oldPlannedStart: phase.plannedStart,
      newPlannedStart: updated.plannedStart,
      oldPlannedEnd: phase.plannedEnd,
      newPlannedEnd: updated.plannedEnd,
    })

    return NextResponse.json({ ok: true, phase: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Aşama tarihi güncellenemedi" },
      { status: 500 }
    );
  }
}
// logActivity import zaten yok, dosya başına ekleyelim

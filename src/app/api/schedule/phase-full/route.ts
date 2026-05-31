import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";
import { emitMetrixEvent } from "@/lib/events/emitMetrixEvent";
import { appendExecutionTimelineEvent } from "@/lib/execution/events";
import { notifySchedulePhaseDateChanged } from "@/lib/schedulePhaseNotifications";
import { notifyPhaseAssigned } from "@/lib/scheduleNotifications";
import { NextRequest, NextResponse } from "next/server";

const phaseLabel: Record<string, string> = { OLCU: "Olcu", IMALAT: "Imalat", MONTAJ: "Montaj", TAS_ALINACAK: "Tas Alinacak" };

function dateOnlyToUtc(dateText: string) {
  return new Date(dateText + "T00:00:00.000Z");
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const isOwner = auth.role === "admin";
    const personelId = auth.personelId || null;

    const body = await req.json();
    const phaseId = String(body.phaseId || "");
    const plannedDate = String(body.plannedDate || "");
    const notes = typeof body.notes === "string" ? body.notes : undefined;
    const photoUrl = typeof body.photoUrl === "string" && body.photoUrl.trim() !== "" ? body.photoUrl.trim() : undefined;
    const personelIds: string[] | null = Array.isArray(body.personelIds)
      ? Array.from(new Set(body.personelIds.map((x: any) => String(x)).filter(Boolean)))
      : null;

    if (!phaseId) return NextResponse.json({ error: "phaseId gerekli" }, { status: 400 });

    const phase = await prisma.schedulePhase.findUnique({
      where: { id: phaseId },
      include: {
        fazAtamalar: { include: { personel: { select: { id: true, ad: true, soyad: true } } } },
        workSchedule: { include: { is: true } },
      },
    });

    if (!phase) return NextResponse.json({ error: "Asama bulunamadi" }, { status: 404 });
    if (phase.workSchedule.is.atolyeId !== auth.atolyeId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    if (!isOwner) {
      const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === personelId);
      if (!atanmisMi) return NextResponse.json({ error: "Sadece size atanmis isi duzenleyebilirsiniz" }, { status: 403 });
      if (personelIds !== null) return NextResponse.json({ error: "Personel atamasini sadece yonetici degistirebilir" }, { status: 403 });
    }

    const nextDate = plannedDate ? dateOnlyToUtc(plannedDate) : null;
    const musteriAdi = phase.workSchedule.is.musteriAdi || "Musteri";
    const fazAdi = phaseLabel[phase.phase] || phase.phase;

    await prisma.$transaction(async (tx) => {
      if (nextDate) {
        await tx.schedulePhase.update({ where: { id: phaseId }, data: { plannedStart: nextDate, plannedEnd: nextDate } });
        if (phase.phase === "OLCU") await tx.workSchedule.update({ where: { id: phase.workScheduleId }, data: { startDate: nextDate } });
        if (phase.phase === "MONTAJ") await tx.workSchedule.update({ where: { id: phase.workScheduleId }, data: { endDate: nextDate } });
      }
      if (notes !== undefined) await tx.workSchedule.update({ where: { id: phase.workScheduleId }, data: { notes } });
      if (photoUrl !== undefined) {
        await tx.schedulePhase.update({
          where: { id: phaseId },
          data: { photoUrl, photoUploadedAt: new Date() },
        });
      }
      if (personelIds !== null) {
        const valid = await tx.personel.findMany({ where: { id: { in: personelIds }, atolyeId: auth.atolyeId, aktif: true }, select: { id: true } });
        const validIds = valid.map((p) => p.id);
        await tx.fazAtama.deleteMany({ where: { schedulePhaseId: phaseId } });
        if (validIds.length) await tx.fazAtama.createMany({ data: validIds.map((personelId) => ({ schedulePhaseId: phaseId, personelId })) });
      }
    });

    const prevPhotoUrl = phase.photoUrl ?? "";
    const shouldAppendPhotoAdded = photoUrl !== undefined && prevPhotoUrl.trim() === "" && photoUrl !== prevPhotoUrl;
    if (shouldAppendPhotoAdded) {
      try {
        await appendExecutionTimelineEvent({
          schedulePhaseId: phaseId,
          atolyeId: auth.atolyeId,
          userId: auth.userId,
          personelId: auth.personelId || null,
          operationStep: phase.phase === "OLCU" ? "OLCU" : phase.phase === "MONTAJ" ? "MONTAJ" : "DIGER",
          eventType: "PHOTO_ADDED",
          metadata: { source: "phase-full" },
          attachmentUrl: photoUrl,
          attachmentType: "PHOTO",
        });
      } catch {}

      try {
        const [actorPersonel, actorUser] = await Promise.all([
          auth.personelId
            ? prisma.personel.findUnique({
                where: { id: auth.personelId },
                select: { ad: true, soyad: true },
              })
            : Promise.resolve(null),
          !auth.personelId && auth.userId
            ? prisma.user.findUnique({
                where: { id: auth.userId },
                select: { ad: true },
              })
            : Promise.resolve(null),
        ]);
        const actorName = actorPersonel
          ? `${actorPersonel.ad}${actorPersonel.soyad ? " " + actorPersonel.soyad : ""}`.trim()
          : actorUser?.ad || null;
        const jobName = phase.workSchedule.is.musteriAdi || phase.workSchedule.is.urunAdi || "İş";
        const deepLink = `/dashboard/is-programi?phaseId=${phaseId}`;

        await emitMetrixEvent({
          atolyeId: auth.atolyeId,
          type: "PHOTO_ADDED",
          source: "schedule",
          severity: "info",
          entityType: "schedule_phase",
          entityId: phaseId,
          title: "Fotoğraf eklendi",
          message: `${jobName} – ${fazAdi} fazına fotoğraf eklendi.`,
          url: deepLink,
          actorId: auth.personelId || auth.userId,
          actorName,
          actorUserId: auth.userId,
          actorPersonelId: auth.personelId || null,
          notify: true,
          feed: true,
          risk: false,
          aiMemory: true,
          payload: {
            jobId: phase.workSchedule.isId,
            jobName,
            scheduleId: phase.workScheduleId,
            phaseId,
            phaseType: phase.phase,
            photoUrl,
            actorId: auth.personelId || auth.userId,
            actorName,
          },
        });
      } catch (error) {
        console.warn("photo activity event failed:", error);
      }
    }

    if (nextDate) {
      const updatedPhaseForNotification = await prisma.schedulePhase.findUnique({
        where: { id: phaseId },
        select: { plannedStart: true, plannedEnd: true },
      });

      await notifySchedulePhaseDateChanged({
        atolyeId: auth.atolyeId,
        userId: auth.userId,
        personelId: auth.personelId || null,
        source: "phase-full",
        phaseId,
        phaseType: phase.phase,
        workScheduleId: phase.workScheduleId,
        jobName: musteriAdi,
        oldPlannedStart: phase.plannedStart,
        newPlannedStart: updatedPhaseForNotification?.plannedStart ?? nextDate,
        oldPlannedEnd: phase.plannedEnd,
        newPlannedEnd: updatedPhaseForNotification?.plannedEnd ?? nextDate,
      });
    }

    if (personelIds !== null) {
      const yeniPersoneller = await prisma.personel.findMany({ where: { id: { in: personelIds } }, select: { ad: true, soyad: true } });
      const isimler = yeniPersoneller.map((p) => p.ad + " " + p.soyad).join(", ") || "personel kaldirildi";
      await notifyPhaseAssigned({
        atolyeId: auth.atolyeId,
        userId: auth.userId,
        personelId: auth.personelId || null,
        jobId: phase.workSchedule.isId,
        jobName: phase.workSchedule.is.urunAdi,
        customerName: musteriAdi,
        workScheduleId: phase.workScheduleId,
        phaseId,
        phaseType: phase.phase,
        assignedPersonelIds: personelIds,
        assignedPersonelNames: isimler ? [isimler] : [],
        action: "changed",
      });
    }

    const prevNotes = phase.workSchedule.notes ?? "";
    if (notes !== undefined && notes.trim() !== "" && notes.trim() !== prevNotes.trim()) {
      const deepLink = `/dashboard/is-programi?phaseId=${phaseId}`;
      await logActivity({ atolyeId: auth.atolyeId, type: "program_not_eklendi", message: musteriAdi + " – " + fazAdi + " fazina not eklendi.", refId: phaseId, url: deepLink, userId: auth.userId, personelId: auth.personelId || undefined });
      try {
        await appendExecutionTimelineEvent({
          schedulePhaseId: phaseId,
          atolyeId: auth.atolyeId,
          userId: auth.userId,
          personelId: auth.personelId || null,
          operationStep: phase.phase === "OLCU" ? "OLCU" : phase.phase === "MONTAJ" ? "MONTAJ" : "DIGER",
          eventType: "NOTE_ADDED",
          note: notes.trim(),
          metadata: { source: "phase-full" },
        });
      } catch {}
    }

    const updated = await prisma.schedulePhase.findUnique({
      where: { id: phaseId },
      include: { fazAtamalar: { include: { personel: { select: { id: true, ad: true, soyad: true, gorevi: true } } } }, workSchedule: true },
    });

    return NextResponse.json({ ok: true, phase: updated });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Faz guncellenemedi" }, { status: 500 });
  }
}

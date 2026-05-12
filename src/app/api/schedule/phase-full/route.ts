import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLogger";
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
      if (personelIds !== null) {
        const valid = await tx.personel.findMany({ where: { id: { in: personelIds }, atolyeId: auth.atolyeId, aktif: true }, select: { id: true } });
        const validIds = valid.map((p) => p.id);
        await tx.fazAtama.deleteMany({ where: { schedulePhaseId: phaseId } });
        if (validIds.length) await tx.fazAtama.createMany({ data: validIds.map((personelId) => ({ schedulePhaseId: phaseId, personelId })) });
      }
    });

    if (nextDate) {
      const tarihStr = nextDate.toLocaleDateString("tr-TR");
      await logActivity({ atolyeId: auth.atolyeId, type: "program_tarih_degisti", message: musteriAdi + " – " + fazAdi + " fazinin tarihi " + tarihStr + " olarak guncellendi.", refId: phaseId, userId: auth.userId });
    }

    if (personelIds !== null) {
      const yeniPersoneller = await prisma.personel.findMany({ where: { id: { in: personelIds } }, select: { ad: true, soyad: true } });
      const isimler = yeniPersoneller.map((p) => p.ad + " " + p.soyad).join(", ") || "personel kaldirildi";
      await logActivity({ atolyeId: auth.atolyeId, type: "program_personel_degisti", message: musteriAdi + " – " + fazAdi + " fazina atama degisti: " + isimler, refId: phaseId, userId: auth.userId });
    }

    if (notes !== undefined) {
      await logActivity({ atolyeId: auth.atolyeId, type: "program_not_eklendi", message: musteriAdi + " – " + fazAdi + " fazina not eklendi.", refId: phaseId, userId: auth.userId });
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

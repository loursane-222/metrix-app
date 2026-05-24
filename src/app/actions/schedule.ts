"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { PhaseType, PHASE_ORDER, canCompletePhase } from "@/lib/types/schedule";

async function authBilgisiAl(): Promise<{
  userId: string | null;
  atolyeId: string | null;
  email: string | null;
  isOwner: boolean;
  personelId: string | null;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) {
    return { userId: null, atolyeId: null, email: null, isOwner: false, personelId: null };
  }

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);
    const role = (payload as any).role || "admin";

    // Personel girişi — token'da personelId ve atolyeId direkt var
    if (role === "personel") {
      const personelId = (payload as any).personelId || null;
      const atolyeId = (payload as any).atolyeId || null;
      const email = (payload as any).email || null;
      return {
        userId: (payload as any).id || null,
        atolyeId,
        email,
        isOwner: false,
        personelId,
      };
    }

    // Admin girişi
    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    if (!user) {
      return { userId: null, atolyeId: null, email: null, isOwner: false, personelId: null };
    }

    return {
      userId: user.id,
      atolyeId: user.atolye?.id || null,
      email: user.email,
      isOwner: true,
      personelId: null,
    };
  } catch {
    return { userId: null, atolyeId: null, email: null, isOwner: false, personelId: null };
  }
}

async function atolyeIdAl(): Promise<string | null> {
  const auth = await authBilgisiAl();
  return auth.atolyeId;
}

export async function getSchedulesForMonth(year: number, month: number) {
  const auth = await authBilgisiAl();
  if (!auth.atolyeId) return [];

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const dateOr = [
    { startDate: { gte: startOfMonth, lte: endOfMonth } },
    { endDate: { gte: startOfMonth, lte: endOfMonth } },
    { startDate: { lte: startOfMonth }, endDate: { gte: endOfMonth } },
    {
      phases: {
        some: {
          OR: [
            { plannedStart: { gte: startOfMonth, lte: endOfMonth } },
            { plannedEnd: { gte: startOfMonth, lte: endOfMonth } },
          ],
        },
      },
    },
  ];

  const where: any = {
    is: { atolyeId: auth.atolyeId },
    OR: dateOr,
  };

  if (!auth.isOwner) {
    if (!auth.personelId) return [];
    where.phases = {
      some: {
        fazAtamalar: {
          some: {
            personelId: auth.personelId,
          },
        },
      },
    };
  }

  const phasesInclude: any = {
    orderBy: { phase: "asc" },
    include: {
      fazAtamalar: {
        include: {
          personel: {
            select: {
              id: true,
              ad: true,
              soyad: true,
              gorevi: true,
              email: true,
            },
          },
        },
      },
      executions: {
        select: { status: true },
      },
    },
  };

  if (!auth.isOwner) {
    phasesInclude.where = {
      fazAtamalar: {
        some: {
          personelId: auth.personelId,
        },
      },
    };
  }

  return prisma.workSchedule.findMany({
    where,
    include: {
      is: {
        select: {
          id: true,
          teklifNo: true,
          musteriAdi: true,
          urunAdi: true,
          tasDurumu: true,
          kirilanTasPlaka: true,
          hataliKesimPlaka: true,
          plakaFiyatiEuro: true,
          kullanilanKur: true,
          kullanilanPlakaSayisi: true,
          toplamMaliyet: true,
          satisFiyati: true,
          toplamSureDakika: true,
          plakaLayoutJson: true,
          plakaImageUrl: true,
        },
      },
      phases: phasesInclude,
    },
    orderBy: { startDate: "asc" },
  });
}

export async function upsertWorkSchedule(data: {
  isId: string;
  startDate?: Date | null;
  endDate?: Date | null;
  notes?: string;
  phases?: Array<{
    phase: PhaseType;
    plannedStart?: Date | null;
    plannedEnd?: Date | null;
  }>;
}) {
  const atolyeId = await atolyeIdAl();
  if (!atolyeId) throw new Error("Yetkisiz");

  const is = await prisma.is.findFirst({
    where: { id: data.isId, atolyeId },
  });
  if (!is) throw new Error("İş bulunamadı");

  const schedule = await prisma.workSchedule.upsert({
    where: { isId: data.isId },
    create: {
      isId: data.isId,
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
      phases: {
        create: PHASE_ORDER.map((phase) => {
          const p = data.phases?.find((x) => x.phase === phase);
          return {
            phase,
            plannedStart: p?.plannedStart ?? null,
            plannedEnd: p?.plannedEnd ?? null,
          };
        }),
      },
    },
    update: {
      startDate: data.startDate,
      endDate: data.endDate,
      notes: data.notes,
    },
    include: { phases: true },
  });

  if (data.phases) {
    for (const phaseData of data.phases) {
      await prisma.schedulePhase.upsert({
        where: {
          workScheduleId_phase: {
            workScheduleId: schedule.id,
            phase: phaseData.phase,
          },
        },
        create: {
          workScheduleId: schedule.id,
          phase: phaseData.phase,
          plannedStart: phaseData.plannedStart ?? null,
          plannedEnd: phaseData.plannedEnd ?? null,
        },
        update: {
          plannedStart: phaseData.plannedStart ?? null,
          plannedEnd: phaseData.plannedEnd ?? null,
        },
      });
    }
  }

  revalidatePath("/dashboard/is-programi");
  return schedule;
}

export async function togglePhaseCompletion(data: {
  schedulePhaseId: string;
  isCompleted: boolean;
  completedBy?: string;
  overrideNote?: string;
  kirilanTasPlaka?: number;
  photoUrl?: string;
}) {
  const auth = await authBilgisiAl();
  if (!auth.atolyeId || !auth.userId) throw new Error("Yetkisiz");

  const phase = await prisma.schedulePhase.findUnique({
    where: { id: data.schedulePhaseId },
    include: {
      workSchedule: {
        include: {
          phases: true,
          is: true,
        },
      },
      fazAtamalar: {
        include: {
          personel: true,
        },
      },
    },
  });

  if (!phase) throw new Error("Aşama bulunamadı");
  if (phase.workSchedule.is.atolyeId !== auth.atolyeId) throw new Error("Yetkisiz");

  let userPersonel: { id: string } | null = null;

  if (!auth.isOwner) {
    if (!auth.email) {
      throw new Error("Kullanıcı e-posta bilgisi bulunamadı.");
    }

    userPersonel = await prisma.personel.findFirst({
      where: {
        email: auth.email,
        atolyeId: auth.atolyeId,
        aktif: true,
      },
    });

    if (!userPersonel) {
      throw new Error("Bu işlem için personel kaydınız bulunmuyor.");
    }

    const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === userPersonel!.id);

    if (!atanmisMi) {
      throw new Error("Sadece bu faza atanmış personel durumu güncelleyebilir.");
    }
  }

  if (data.isCompleted) {
    const check = canCompletePhase(phase.workSchedule.phases, phase.phase as PhaseType);
    if (!check.allowed && !data.overrideNote) {
      throw new Error(check.reason ?? "Bu aşama henüz işaretlenemez");
    }
  }

  const kirilanTasPlaka = Math.max(0, Number(data.kirilanTasPlaka || 0));

  if (
    phase.phase === "IMALAT" &&
    data.isCompleted === true &&
    kirilanTasPlaka > 0
  ) {
    await prisma.is.update({
      where: { id: phase.workSchedule.isId },
      data: {
        kirilanTasPlaka: {
          increment: kirilanTasPlaka,
        },
      },
    });
  }

  // MONTAJ tamamlandığında işi "montaj_tamamlandi" yap
  if (phase.phase === "MONTAJ" && data.isCompleted === true) {
    await prisma.is.update({
      where: { id: phase.workSchedule.isId },
      data: { durum: "montaj_tamamlandi" },
    });
  }

  const updated = await prisma.schedulePhase.update({
    where: { id: data.schedulePhaseId },
    data: {
      isCompleted: data.isCompleted,
      completedAt: data.isCompleted ? new Date() : null,
      completedBy: data.isCompleted ? (userPersonel?.id ?? null) : null,
      isOverridden: !!data.overrideNote,
      overrideNote: data.overrideNote ?? null,
      ...(data.photoUrl !== undefined && {
        photoUrl: data.photoUrl || null,
        photoUploadedAt: data.photoUrl ? new Date() : null,
      }),
    },
  });

  try {
    const { logActivity } = await import('@/lib/activityLogger')
    const phaseLabels: Record<string, string> = { OLCU: 'Olcu', IMALAT: 'Imalat', MONTAJ: 'Montaj', TAS_ALINACAK: 'Tas Alinacak' }
    const fazAdi = phaseLabels[phase.phase] || phase.phase
    const musteriAdi = phase.workSchedule.is.musteriAdi || 'Musteri'
    const mesaj = data.isCompleted
      ? musteriAdi + ' – ' + fazAdi + ' fazi tamamlandi.'
      : musteriAdi + ' – ' + fazAdi + ' fazi tamamlandi isaretlenmesi geri alindi.'
    await logActivity({
      atolyeId: phase.workSchedule.is.atolyeId,
      type: data.isCompleted ? 'faz_tamamlandi' : 'faz_geri_alindi',
      message: mesaj,
      refId: phase.workSchedule.isId,
      userId: auth.userId || undefined,
      personelId: auth.personelId || undefined,
    })
  } catch {}

  revalidatePath("/dashboard/is-programi");
  return updated;
}

export async function searchIsler(q: string) {
  const atolyeId = await atolyeIdAl();
  if (!atolyeId || q.length < 2) return [];

  return prisma.is.findMany({
    where: {
      atolyeId,
      OR: [
        { teklifNo: { contains: q, mode: "insensitive" } },
        { musteriAdi: { contains: q, mode: "insensitive" } },
        { urunAdi: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      teklifNo: true,
      musteriAdi: true,
      urunAdi: true,
    },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
}

export async function movePhase(data: {
  schedulePhaseId: string;
  newStart: Date;
  newEnd: Date;
}) {
  const atolyeId = await atolyeIdAl();
  if (!atolyeId) throw new Error("Yetkisiz");

  const phase = await prisma.schedulePhase.findUnique({
    where: { id: data.schedulePhaseId },
    include: { workSchedule: { include: { is: true } } },
  });

  if (!phase) throw new Error("Aşama bulunamadı");
  if (phase.workSchedule.is.atolyeId !== atolyeId) throw new Error("Yetkisiz");

  const updated = await prisma.schedulePhase.update({
    where: { id: data.schedulePhaseId },
    data: {
      plannedStart: data.newStart,
      plannedEnd: data.newEnd,
    },
  });

  revalidatePath("/dashboard/is-programi");
  return updated;
}

export async function updateTasDurumu(data: {
  isId: string;
  tasDurumu: string;
}) {
  const atolyeId = await atolyeIdAl();
  if (!atolyeId) throw new Error("Yetkisiz");

  const is = await prisma.is.findFirst({
    where: { id: data.isId, atolyeId },
  });
  if (!is) throw new Error("İş bulunamadı");

  const updated = await prisma.is.update({
    where: { id: data.isId },
    data: { tasDurumu: data.tasDurumu },
  });

  revalidatePath("/dashboard/is-programi");
  return updated;
}

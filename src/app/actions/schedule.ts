"use server";

import { revalidatePath } from "next/cache";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { PhaseType, PHASE_ORDER, canCompletePhase } from "@/lib/types/schedule";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

async function authBilgisiAl(): Promise<{
  userId: string | null;
  atolyeId: string | null;
  email: string | null;
}> {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return { userId: null, atolyeId: null, email: null };

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    return {
      userId: user?.id || null,
      atolyeId: user?.atolye?.id || null,
      email: user?.email || null,
    };
  } catch {
    return { userId: null, atolyeId: null, email: null };
  }
}

async function atolyeIdAl(): Promise<string | null> {
  const auth = await authBilgisiAl();
  return auth.atolyeId;
}

export async function getSchedulesForMonth(year: number, month: number) {
  const atolyeId = await atolyeIdAl();
  if (!atolyeId) return [];

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  return prisma.workSchedule.findMany({
    where: {
      is: { atolyeId },
      OR: [
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
      ],
    },
    include: {
      is: {
        select: {
          id: true,
          teklifNo: true,
          musteriAdi: true,
          urunAdi: true,
          tasDurumu: true,
        },
      },
      phases: {
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
        },
      },
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

  if (!auth.email) {
    throw new Error("Kullanıcı e-posta bilgisi bulunamadı.");
  }

  const userPersonel = await prisma.personel.findFirst({
    where: {
      email: auth.email,
      atolyeId: auth.atolyeId,
      aktif: true,
    },
  });

  if (!userPersonel) {
    throw new Error("Bu işlem için personel kaydınız bulunmuyor.");
  }

  const atanmisMi = phase.fazAtamalar.some((a) => a.personelId === userPersonel.id);

  if (!atanmisMi) {
    throw new Error("Sadece bu faza atanmış personel durumu güncelleyebilir.");
  }

  if (data.isCompleted) {
    const check = canCompletePhase(phase.workSchedule.phases, phase.phase as PhaseType);
    if (!check.allowed && !data.overrideNote) {
      throw new Error(check.reason ?? "Bu aşama henüz işaretlenemez");
    }
  }

  const updated = await prisma.schedulePhase.update({
    where: { id: data.schedulePhaseId },
    data: {
      isCompleted: data.isCompleted,
      completedAt: data.isCompleted ? new Date() : null,
      completedBy: data.isCompleted ? userPersonel.id : null,
      isOverridden: !!data.overrideNote,
      overrideNote: data.overrideNote ?? null,
    },
  });

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

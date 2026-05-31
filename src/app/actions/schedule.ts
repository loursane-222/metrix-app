"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { PhaseType, PHASE_ORDER, canCompletePhase } from "@/lib/types/schedule";
import { activateDraftReservationsForJob, isStockReservationConflict } from "@/lib/stock/reservations";
import { notifySchedulePhaseDateChanged } from "@/lib/schedulePhaseNotifications";
import { notifyStockReserved } from "@/lib/stockNotifications";
import { syncStonePurchasePhaseForOlcu } from "@/lib/scheduleStonePhase";
import {
  notifyJobScheduled,
  notifyPhaseCompleted,
  notifyPhaseReopened,
  notifyProductionOperationReady,
} from "@/lib/scheduleNotifications";

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

const DEFAULT_IMALAT_OPERATIONS = [
  { operationType: "KESIM", status: "PLANNED" },
  { operationType: "TOPLAMA", status: "PLANNED" },
] as const;

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
      operations: {
        orderBy: { operationType: "asc" },
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
          stoneSource: true,
          selectedStockPlateId: true,
          stockMaterialSnapshot: true,
          plakaFiyatiEuro: true,
          kullanilanKur: true,
          kullanilanPlakaSayisi: true,
          operasyonelFireMaliyeti: true,
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

  const existingSchedule = await prisma.workSchedule.findUnique({
    where: { isId: data.isId },
    select: {
      id: true,
      phases: {
        select: {
          id: true,
          phase: true,
          plannedStart: true,
          plannedEnd: true,
          workScheduleId: true,
        },
      },
    },
  });

  let schedule;
  try {
    schedule = await prisma.$transaction(async (tx) => {
      const saved = await tx.workSchedule.upsert({
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
          await tx.schedulePhase.upsert({
            where: {
              workScheduleId_phase: {
                workScheduleId: saved.id,
                phase: phaseData.phase,
              },
            },
            create: {
              workScheduleId: saved.id,
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

      let phases = await tx.schedulePhase.findMany({ where: { workScheduleId: saved.id } });

      const olcuPhaseForStone = phases.find((phase) => phase.phase === "OLCU");
      await syncStonePurchasePhaseForOlcu(tx, {
        workScheduleId: saved.id,
        job: is,
        olcuPlannedStart: olcuPhaseForStone?.plannedStart ?? data.startDate,
      });

      phases = await tx.schedulePhase.findMany({ where: { workScheduleId: saved.id } });
      if (!existingSchedule) {
        const imalatPhase = phases.find((phase) => phase.phase === "IMALAT");
        if (imalatPhase) {
          await tx.schedulePhaseOperation.createMany({
            data: DEFAULT_IMALAT_OPERATIONS.map((operation) => ({
              schedulePhaseId: imalatPhase.id,
              operationType: operation.operationType,
              status: operation.status,
              plannedStart: imalatPhase.plannedStart,
              plannedEnd: imalatPhase.plannedEnd,
            })),
            skipDuplicates: true,
          });
        }

        const activatedReservations = await activateDraftReservationsForJob(tx, {
          atolyeId,
          isId: data.isId,
          schedulePhaseId: imalatPhase?.id ?? null,
        });

        return { ...saved, phases, activatedReservations };
      }

      return { ...saved, phases, activatedReservations: { count: 0, reservations: [] } };
    });
  } catch (error) {
    if (isStockReservationConflict(error)) {
      throw new Error("Bu plaka başka bir aktif işte rezerve.");
    }
    throw error;
  }

  revalidatePath("/dashboard/is-programi");

  if (!existingSchedule) {
    const firstPhase = schedule.phases.find((phase: { phase: PhaseType }) => phase.phase === "OLCU") ?? schedule.phases[0];
    if (firstPhase) {
      await notifyJobScheduled({
        atolyeId,
        jobId: data.isId,
        jobName: is.urunAdi,
        customerName: is.musteriAdi,
        workScheduleId: schedule.id,
        phaseId: firstPhase.id,
        phaseType: firstPhase.phase,
      });
    }

    if (firstPhase && schedule.activatedReservations?.count > 0) {
      const imalatPhase = schedule.phases.find((phase: { phase: PhaseType }) => phase.phase === "IMALAT");
      await notifyStockReserved({
        atolyeId,
        jobId: data.isId,
        jobName: is.urunAdi,
        customerName: is.musteriAdi,
        workScheduleId: schedule.id,
        phaseId: imalatPhase?.id ?? firstPhase.id,
        schedulePhaseId: imalatPhase?.id ?? firstPhase.id,
        reservationIds: schedule.activatedReservations.reservations.map((reservation: { id: string }) => reservation.id),
        stockPlateIds: schedule.activatedReservations.reservations.map((reservation: { stockPlateId: string }) => reservation.stockPlateId),
        quantity: schedule.activatedReservations.count,
        metadata: {
          action: "reservation_activated_on_schedule_create",
        },
      });
    }
  }

  if (existingSchedule && data.phases?.length) {
    const previousByPhase = new Map(existingSchedule.phases.map((phase) => [phase.phase, phase]));
    for (const phaseData of data.phases) {
      const previous = previousByPhase.get(phaseData.phase);
      const current = schedule.phases.find((phase: { phase: PhaseType }) => phase.phase === phaseData.phase);
      if (!previous || !current) continue;

      await notifySchedulePhaseDateChanged({
        atolyeId,
        source: "upsertWorkSchedule",
        phaseId: current.id,
        phaseType: current.phase,
        workScheduleId: current.workScheduleId,
        jobName: is.musteriAdi || is.urunAdi || "İş",
        oldPlannedStart: previous.plannedStart,
        newPlannedStart: current.plannedStart,
        oldPlannedEnd: previous.plannedEnd,
        newPlannedEnd: current.plannedEnd,
      });
    }
  }

  const { activatedReservations: _activatedReservations, ...scheduleForReturn } = schedule;
  return scheduleForReturn;
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

  const now = new Date();
  const phaseStateChanged = phase.isCompleted !== data.isCompleted;
  type CuttingReadyNotification = {
    phaseOperationId: string;
    schedulePhaseId: string;
    workScheduleId: string;
    jobId: string;
  };
  const txResult = await prisma.$transaction(async (tx) => {
    let cuttingReadyNotification: CuttingReadyNotification | null = null;
    const saved = await tx.schedulePhase.update({
      where: { id: data.schedulePhaseId },
      data: {
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? now : null,
        completedBy: data.isCompleted ? (userPersonel?.id ?? null) : null,
        isOverridden: !!data.overrideNote,
        overrideNote: data.overrideNote ?? null,
        ...(data.photoUrl !== undefined && {
          photoUrl: data.photoUrl || null,
          photoUploadedAt: data.photoUrl ? now : null,
        }),
      },
    });

    if (phase.phase === "OLCU" && data.isCompleted === true) {
      const imalatPhase = await tx.schedulePhase.findUnique({
        where: {
          workScheduleId_phase: {
            workScheduleId: phase.workScheduleId,
            phase: "IMALAT",
          },
        },
        select: { id: true },
      });

      if (imalatPhase) {
        const kesimOperation = await tx.schedulePhaseOperation.findUnique({
          where: {
            schedulePhaseId_operationType: {
              schedulePhaseId: imalatPhase.id,
              operationType: "KESIM",
            },
          },
          select: { id: true },
        });
        const readyResult = await tx.schedulePhaseOperation.updateMany({
          where: {
            schedulePhaseId: imalatPhase.id,
            operationType: "KESIM",
            status: "PLANNED",
          },
          data: {
            status: "READY",
            readyAt: now,
          },
        });
        if (kesimOperation && readyResult.count > 0) {
          cuttingReadyNotification = {
            phaseOperationId: kesimOperation.id,
            schedulePhaseId: imalatPhase.id,
            workScheduleId: phase.workScheduleId,
            jobId: phase.workSchedule.isId,
          };
        }
      }
    }

    return { saved, cuttingReadyNotification };
  });
  const updated = txResult.saved;

  try {
    const phaseContext = {
      atolyeId: phase.workSchedule.is.atolyeId,
      userId: auth.userId || undefined,
      personelId: auth.personelId || undefined,
      jobId: phase.workSchedule.isId,
      jobName: phase.workSchedule.is.urunAdi,
      customerName: phase.workSchedule.is.musteriAdi,
      workScheduleId: phase.workScheduleId,
      phaseId: phase.id,
      phaseType: phase.phase,
    };
    if (phaseStateChanged) {
      if (data.isCompleted) {
        await notifyPhaseCompleted(phaseContext);
      } else {
        await notifyPhaseReopened(phaseContext);
      }
    }
    if (txResult.cuttingReadyNotification) {
      await notifyProductionOperationReady({
        ...phaseContext,
        phaseId: txResult.cuttingReadyNotification.schedulePhaseId,
        phaseType: "IMALAT",
        phaseOperationId: txResult.cuttingReadyNotification.phaseOperationId,
        operationType: "KESIM",
      });
    }
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
  const auth = await authBilgisiAl();
  if (!auth.atolyeId) throw new Error("Yetkisiz");

  const phase = await prisma.schedulePhase.findUnique({
    where: { id: data.schedulePhaseId },
    include: { workSchedule: { include: { is: true } } },
  });

  if (!phase) throw new Error("Aşama bulunamadı");
  if (phase.workSchedule.is.atolyeId !== auth.atolyeId) throw new Error("Yetkisiz");

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.schedulePhase.update({
      where: { id: data.schedulePhaseId },
      data: {
        plannedStart: data.newStart,
        plannedEnd: data.newEnd,
      },
    });

    if (phase.phase === "OLCU") {
      await syncStonePurchasePhaseForOlcu(tx, {
        workScheduleId: phase.workScheduleId,
        job: phase.workSchedule.is,
        olcuPlannedStart: data.newStart,
      });
    }

    return saved;
  });

  await notifySchedulePhaseDateChanged({
    atolyeId: auth.atolyeId,
    userId: auth.userId,
    personelId: auth.personelId,
    source: "movePhase",
    phaseId: phase.id,
    phaseType: phase.phase,
    workScheduleId: phase.workScheduleId,
    jobName: phase.workSchedule.is.musteriAdi || phase.workSchedule.is.urunAdi || "İş",
    oldPlannedStart: phase.plannedStart,
    newPlannedStart: data.newStart,
    oldPlannedEnd: phase.plannedEnd,
    newPlannedEnd: data.newEnd,
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

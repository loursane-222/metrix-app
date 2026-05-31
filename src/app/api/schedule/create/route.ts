import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { activateDraftReservationsForJob, isStockReservationConflict } from "@/lib/stock/reservations";
import { notifyJobScheduled } from "@/lib/scheduleNotifications";
import { notifyStockReserved } from "@/lib/stockNotifications";
import { syncStonePurchasePhaseForOlcu } from "@/lib/scheduleStonePhase";

async function ownerAtolyeIdAl() {
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

    return user?.atolye?.id || null;
  } catch {
    return null;
  }
}

function isBusinessDay(d: Date) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(start: Date, days: number) {
  const d = new Date(start);
  let added = 0;

  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) added++;
  }

  return d;
}

function atStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
}

function isBusinessDayStrict(d: Date) {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function pushToBusinessDay(d: Date) {
  const n = new Date(d);
  while (!isBusinessDayStrict(n)) {
    n.setDate(n.getDate() + 1);
  }
  return n;
}

function safeDate(value: any, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return pushToBusinessDay(d);
}

const DEFAULT_IMALAT_OPERATIONS = [
  { operationType: "KESIM", status: "PLANNED" },
  { operationType: "TOPLAMA", status: "PLANNED" },
] as const;

export async function POST(req: NextRequest) {
  try {
    const atolyeId = await ownerAtolyeIdAl();
    if (!atolyeId) {
      return NextResponse.json({ error: "Sadece ana hesap yeni iş oluşturabilir" }, { status: 403 });
    }

    const body = await req.json();
    const isId = String(body.isId || "");

    if (!isId) {
      return NextResponse.json({ error: "İş seçilmedi" }, { status: 400 });
    }

    const job = await prisma.is.findFirst({
      where: { id: isId, atolyeId },
      include: { workSchedule: true },
    });

    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
    if (job.workSchedule) return NextResponse.json({ error: "Bu iş zaten programa alınmış" }, { status: 409 });

    const today = new Date();
    const base = isBusinessDay(today) ? today : addBusinessDays(today, 1);

    const defaultOlcu = atStartOfDay(base);
    const defaultImalat = atStartOfDay(addBusinessDays(defaultOlcu, 1));
    const defaultMontaj = atStartOfDay(addBusinessDays(defaultImalat, 1));

    const plan = body.plan || {};

    const olcu = safeDate(plan.OLCU, defaultOlcu);
    const imalat = safeDate(plan.IMALAT, defaultImalat);
    const montaj = safeDate(plan.MONTAJ, defaultMontaj);

    const transactionResult = await prisma.$transaction(async (tx) => {
      const created = await tx.workSchedule.create({
        data: {
          isId,
          startDate: olcu,
          endDate: montaj,
          phases: {
            create: [
              { phase: "OLCU", plannedStart: olcu, plannedEnd: olcu },
              { phase: "IMALAT", plannedStart: imalat, plannedEnd: imalat },
              { phase: "MONTAJ", plannedStart: montaj, plannedEnd: montaj },
            ],
          },
        },
        include: {
          is: true,
          phases: {
            include: {
              fazAtamalar: {
                include: { personel: true },
              },
              operations: {
                orderBy: { operationType: "asc" },
              },
            },
          },
        },
      });

      const imalatPhase = created.phases.find((phase) => phase.phase === "IMALAT");
      if (imalatPhase) {
        await tx.schedulePhaseOperation.createMany({
          data: DEFAULT_IMALAT_OPERATIONS.map((operation) => ({
            schedulePhaseId: imalatPhase.id,
            operationType: operation.operationType,
            status: operation.status,
            plannedStart: imalat,
            plannedEnd: imalat,
          })),
          skipDuplicates: true,
        });
      }

      await syncStonePurchasePhaseForOlcu(tx, {
        workScheduleId: created.id,
        job,
        olcuPlannedStart: olcu,
      });

      const activatedReservations = await activateDraftReservationsForJob(tx, {
        atolyeId,
        isId,
        schedulePhaseId: imalatPhase?.id ?? null,
      });

      const schedule = await tx.workSchedule.findUnique({
        where: { id: created.id },
        include: {
          is: true,
          phases: {
            include: {
              fazAtamalar: {
                include: { personel: true },
              },
              operations: {
                orderBy: { operationType: "asc" },
              },
            },
          },
        },
      });

      return { schedule: schedule ?? created, activatedReservations };
    });
    const schedule = transactionResult.schedule;

    // ── AI mod personel ataması ─────────────────────────────────────────────
    // FazAtama hataları WorkSchedule oluşturmayı engellemez; ayrı try-catch'te.
    const personelOnerisi = body.personelOnerisi as {
      OLCU?: string | null;
      IMALAT_KESIM?: string | null;
      IMALAT_TOPLAMA?: string | null;
      MONTAJ?: string | null;
    } | undefined;

    if (personelOnerisi) {
      try {
        const rawIds = [
          personelOnerisi.OLCU,
          personelOnerisi.IMALAT_KESIM,
          personelOnerisi.IMALAT_TOPLAMA,
          personelOnerisi.MONTAJ,
        ].filter((id): id is string => typeof id === "string" && id.length > 0);

        const uniqueIds = [...new Set(rawIds)];

        const validPersonel =
          uniqueIds.length > 0
            ? await prisma.personel.findMany({
                where: { id: { in: uniqueIds }, atolyeId, aktif: true },
                select: { id: true },
              })
            : [];
        const validSet = new Set(validPersonel.map((p) => p.id));

        for (const phase of schedule.phases) {
          const ids: string[] = [];

          if (phase.phase === "OLCU" && personelOnerisi.OLCU && validSet.has(personelOnerisi.OLCU)) {
            ids.push(personelOnerisi.OLCU);
          }
          if (phase.phase === "IMALAT") {
            if (personelOnerisi.IMALAT_KESIM && validSet.has(personelOnerisi.IMALAT_KESIM)) {
              ids.push(personelOnerisi.IMALAT_KESIM);
            }
            if (
              personelOnerisi.IMALAT_TOPLAMA &&
              validSet.has(personelOnerisi.IMALAT_TOPLAMA) &&
              personelOnerisi.IMALAT_TOPLAMA !== personelOnerisi.IMALAT_KESIM
            ) {
              ids.push(personelOnerisi.IMALAT_TOPLAMA);
            }
          }
          if (phase.phase === "MONTAJ" && personelOnerisi.MONTAJ && validSet.has(personelOnerisi.MONTAJ)) {
            ids.push(personelOnerisi.MONTAJ);
          }

          for (const personelId of ids) {
            try {
              await prisma.fazAtama.create({
                data: { schedulePhaseId: phase.id, personelId },
              });
            } catch (fazErr) {
              console.warn(
                `[schedule/create] FazAtama oluşturulamadı — phaseId: ${phase.id}, personelId: ${personelId}, hata: ${fazErr instanceof Error ? fazErr.message : String(fazErr)}`
              );
            }
          }
        }
      } catch (personelErr) {
        console.warn(
          `[schedule/create] Personel atama bloğu hata verdi (program yine de oluşturuldu) — isId: ${isId}, hata: ${personelErr instanceof Error ? personelErr.message : String(personelErr)}`
        );
      }
    }

    const firstPhase = schedule.phases.find((phase) => phase.phase === "OLCU") ?? schedule.phases[0];
    if (firstPhase) {
      await notifyJobScheduled({
        atolyeId,
        jobId: schedule.isId,
        jobName: schedule.is?.urunAdi,
        customerName: schedule.is?.musteriAdi,
        workScheduleId: schedule.id,
        phaseId: firstPhase.id,
        phaseType: firstPhase.phase,
      });
    }

    if (transactionResult.activatedReservations.count > 0) {
      const imalatPhase = schedule.phases.find((phase) => phase.phase === "IMALAT");
      await notifyStockReserved({
        atolyeId,
        jobId: schedule.isId,
        jobName: schedule.is?.urunAdi,
        customerName: schedule.is?.musteriAdi,
        workScheduleId: schedule.id,
        phaseId: imalatPhase?.id ?? firstPhase?.id ?? null,
        schedulePhaseId: imalatPhase?.id ?? firstPhase?.id ?? null,
        reservationIds: transactionResult.activatedReservations.reservations.map((reservation) => reservation.id),
        stockPlateIds: transactionResult.activatedReservations.reservations.map((reservation) => reservation.stockPlateId),
        quantity: transactionResult.activatedReservations.count,
        metadata: {
          action: "reservation_activated_on_schedule_create",
        },
      });
    }

    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    if (isStockReservationConflict(error)) {
      return NextResponse.json({ error: "Bu plaka başka bir aktif işte rezerve." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "İş programa eklenemedi" }, { status: 500 });
  }
}

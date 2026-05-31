import { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

const OPEN_STATUSES = ["DRAFT", "ACTIVE"] as const;

export class StockReservationConflictError extends Error {
  constructor(message = "Bu plaka başka bir aktif işte rezerve.") {
    super(message);
    this.name = "StockReservationConflictError";
  }
}

export function isStockReservationConflict(error: unknown) {
  if (error instanceof StockReservationConflictError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target;
    const targetText = Array.isArray(target) ? target.join(",") : String(target ?? "");
    return (
      targetText.includes("stock_reservations_one_active_plate") ||
      targetText === "atolyeId,stockPlateId"
    );
  }
  return false;
}

export class StockReservationReleaseBlockedError extends Error {
  constructor(message = "Bu plaka imalata başlamış. Serbest bırakmadan önce kesim sonucu kaydedilmeli.") {
    super(message);
    this.name = "StockReservationReleaseBlockedError";
  }
}

export function isStockReservationReleaseBlocked(error: unknown) {
  return error instanceof StockReservationReleaseBlockedError;
}

async function updatePlateAvailabilityAfterRelease(tx: Db, atolyeId: string, stockPlateId: string) {
  const activeCount = await tx.stockReservation.count({
    where: { atolyeId, stockPlateId, status: "ACTIVE" },
  });
  if (activeCount === 0) {
    await tx.stockPlate.updateMany({
      where: { id: stockPlateId, atolyeId, status: "RESERVED" },
      data: { status: "AVAILABLE" },
    });
  }
}

async function hasStartedImalatWithoutCutResult(tx: Db, reservation: { atolyeId: string; isId: string | null }) {
  if (!reservation.isId) return false;
  const execution = await tx.phaseExecution.findFirst({
    where: {
      atolyeId: reservation.atolyeId,
      status: { in: ["STARTED", "PAUSED"] },
      schedulePhase: {
        phase: "IMALAT",
        workSchedule: { isId: reservation.isId },
      },
    },
    select: { id: true },
  });
  if (!execution) return false;
  const cutResult = await tx.phaseExecutionEvent.findFirst({
    where: {
      atolyeId: reservation.atolyeId,
      phaseExecutionId: execution.id,
      eventType: "CUT_RESULT_RECORDED",
    },
    select: { id: true },
  });
  return !cutResult;
}

export async function releaseReservation(
  tx: Db,
  reservationId: string,
  options: { allowStartedImalatRelease?: boolean } = {},
) {
  const reservation = await tx.stockReservation.findUnique({ where: { id: reservationId } });
  if (!reservation || reservation.status === "RELEASED" || reservation.status === "CONSUMED") {
    return reservation;
  }

  const previousStatus = reservation.status;
  if (
    previousStatus === "ACTIVE" &&
    !options.allowStartedImalatRelease &&
    await hasStartedImalatWithoutCutResult(tx, reservation)
  ) {
    throw new StockReservationReleaseBlockedError();
  }

  const released = await tx.stockReservation.update({
    where: { id: reservation.id },
    data: { status: "RELEASED", releasedAt: new Date() },
  });

  if (previousStatus === "ACTIVE") {
    await tx.stockMovement.create({
      data: {
        atolyeId: reservation.atolyeId,
        stockPlateId: reservation.stockPlateId,
        movementType: "RELEASE",
        quantityAreaCm2: reservation.reservedAreaCm2,
        isId: reservation.isId,
        reasonCode: "RESERVATION_RELEASED",
        note: "Stok rezervasyonu serbest bırakıldı",
      },
    });
    await updatePlateAvailabilityAfterRelease(tx, reservation.atolyeId, reservation.stockPlateId);
  }

  return released;
}

export async function releaseOpenReservationsForJob(
  tx: Db,
  input: { atolyeId: string; isId: string; exceptStockPlateId?: string | null },
) {
  const reservations = await tx.stockReservation.findMany({
    where: {
      atolyeId: input.atolyeId,
      isId: input.isId,
      status: { in: [...OPEN_STATUSES] },
      ...(input.exceptStockPlateId ? { stockPlateId: { not: input.exceptStockPlateId } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  for (const reservation of reservations) {
    await releaseReservation(tx, reservation.id);
  }
}

export async function ensureDraftReservationForJob(
  tx: Db,
  input: { atolyeId: string; isId: string; stockPlateId: string; reservedAreaCm2?: number | null },
) {
  const existing = await tx.stockReservation.findFirst({
    where: {
      atolyeId: input.atolyeId,
      isId: input.isId,
      stockPlateId: input.stockPlateId,
      status: { in: ["DRAFT", "ACTIVE"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    if (existing.status === "DRAFT") {
      return tx.stockReservation.update({
        where: { id: existing.id },
        data: { reservedAreaCm2: input.reservedAreaCm2 ?? existing.reservedAreaCm2 },
      });
    }
    return existing;
  }

  return tx.stockReservation.create({
    data: {
      atolyeId: input.atolyeId,
      isId: input.isId,
      stockPlateId: input.stockPlateId,
      reservedAreaCm2: input.reservedAreaCm2 ?? undefined,
      status: "DRAFT",
    },
  });
}

export async function syncJobStockDraftReservation(
  tx: Db,
  input: { atolyeId: string; isId: string; stockPlateId?: string | null; reservedAreaCm2?: number | null },
) {
  await releaseOpenReservationsForJob(tx, {
    atolyeId: input.atolyeId,
    isId: input.isId,
    exceptStockPlateId: input.stockPlateId ?? null,
  });

  if (!input.stockPlateId) {
    await releaseOpenReservationsForJob(tx, { atolyeId: input.atolyeId, isId: input.isId });
    return null;
  }

  return ensureDraftReservationForJob(tx, {
    atolyeId: input.atolyeId,
    isId: input.isId,
    stockPlateId: input.stockPlateId,
    reservedAreaCm2: input.reservedAreaCm2,
  });
}

export async function activateDraftReservationsForJob(
  tx: Db,
  input: { atolyeId: string; isId: string; schedulePhaseId?: string | null },
) {
  const drafts = await tx.stockReservation.findMany({
    where: { atolyeId: input.atolyeId, isId: input.isId, status: "DRAFT" },
    orderBy: { createdAt: "asc" },
  });

  for (const draft of drafts) {
    const conflict = await tx.stockReservation.findFirst({
      where: {
        atolyeId: draft.atolyeId,
        stockPlateId: draft.stockPlateId,
        status: "ACTIVE",
        NOT: { id: draft.id },
      },
      select: { id: true },
    });
    if (conflict) throw new StockReservationConflictError();

    try {
      await tx.stockReservation.update({
        where: { id: draft.id },
        data: { status: "ACTIVE", schedulePhaseId: input.schedulePhaseId ?? draft.schedulePhaseId },
      });
    } catch (error) {
      if (isStockReservationConflict(error)) throw new StockReservationConflictError();
      throw error;
    }

    await tx.stockPlate.updateMany({
      where: { id: draft.stockPlateId, atolyeId: draft.atolyeId },
      data: { status: "RESERVED" },
    });

    await tx.stockMovement.create({
      data: {
        atolyeId: draft.atolyeId,
        stockPlateId: draft.stockPlateId,
        movementType: "RESERVE",
        quantityAreaCm2: draft.reservedAreaCm2,
        isId: draft.isId,
        reasonCode: "RESERVATION_ACTIVATED",
        note: "Stok rezervasyonu aktif edildi",
      },
    });
  }

  return drafts.length;
}

export async function consumeActiveReservationsForJob(
  tx: Db,
  input: { atolyeId: string; isId: string },
) {
  const reservations = await tx.stockReservation.findMany({
    where: { atolyeId: input.atolyeId, isId: input.isId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  let consumedCount = 0;

  for (const reservation of reservations) {
    const plate = await tx.stockPlate.findFirst({
      where: { id: reservation.stockPlateId, atolyeId: reservation.atolyeId },
      select: {
        id: true,
        totalAreaCm2: true,
        remainingAreaCm2: true,
        purchaseTotalCost: true,
        purchaseCurrency: true,
      },
    });

    const result = await tx.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "CONSUMED", consumedAt: new Date() },
    });
    if (result.count === 0) continue;

    const quantityAreaCm2 =
      reservation.reservedAreaCm2 ??
      plate?.remainingAreaCm2 ??
      plate?.totalAreaCm2 ??
      undefined;

    await tx.stockMovement.create({
      data: {
        atolyeId: reservation.atolyeId,
        stockPlateId: reservation.stockPlateId,
        movementType: "CONSUME",
        quantityAreaCm2,
        isId: reservation.isId,
        reasonCode: "RESERVATION_CONSUMED",
        note: "Stok rezervasyonu üretimde tüketildi",
      },
    });

    await tx.materialConsumption.create({
      data: {
        atolyeId: reservation.atolyeId,
        isId: reservation.isId ?? input.isId,
        stockPlateId: reservation.stockPlateId,
        areaCm2: quantityAreaCm2 ?? 0,
        costAmount: plate?.purchaseTotalCost,
        currency: "TRY",
        source: "STOCK_RESERVATION",
      },
    });

    await tx.stockPlate.updateMany({
      where: { id: reservation.stockPlateId, atolyeId: reservation.atolyeId },
      data: { status: "USED", remainingAreaCm2: 0 },
    });

    consumedCount += 1;
  }

  return consumedCount;
}

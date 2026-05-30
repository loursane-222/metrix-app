import { PhaseType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decimal, n, offcutCode } from "@/lib/stock/offcuts";
import { ExecutionError, computeWorkMinutes } from "@/lib/execution/service";

type Db = Prisma.TransactionClient;

export type CutResultPieceInput = {
  sourceId?: string | number | null;
  label?: string | null;
  expectedWidthCm?: number | null;
  expectedHeightCm?: number | null;
  actualWidthCm?: number | null;
  actualHeightCm?: number | null;
  cut?: boolean | null;
};

export type CutResultOffcutInput = {
  widthCm?: number | null;
  heightCm?: number | null;
  notes?: string | null;
};

export type CutResultStoneBrokenInput = {
  enabled?: boolean | null;
  description?: string | null;
  widthCm?: number | null;
  heightCm?: number | null;
  requiresNewPlate?: boolean | null;
};

export type CompleteImalatWithCutResultInput = {
  executionId: string;
  atolyeId: string;
  personelId?: string | null;
  userId?: string | null;
  pieces?: CutResultPieceInput[];
  offcuts?: CutResultOffcutInput[];
  stoneBroken?: CutResultStoneBrokenInput | null;
  note?: string | null;
};

function actorFields(personelId?: string | null, userId?: string | null) {
  if (personelId) return { actorType: "PERSONEL", actorPersonelId: personelId, actorUserId: null };
  if (userId) return { actorType: "USER", actorPersonelId: null, actorUserId: userId };
  return { actorType: "SYSTEM", actorPersonelId: null, actorUserId: null };
}

function normalizePieces(pieces: CutResultPieceInput[] = []) {
  return pieces
    .map((piece, index) => {
      const expectedWidthCm = n(piece.expectedWidthCm);
      const expectedHeightCm = n(piece.expectedHeightCm);
      const actualWidthCm = n(piece.actualWidthCm) || expectedWidthCm;
      const actualHeightCm = n(piece.actualHeightCm) || expectedHeightCm;
      return {
        sourceId: piece.sourceId != null ? String(piece.sourceId) : String(index + 1),
        label: String(piece.label || `Parça ${index + 1}`).trim(),
        expectedWidthCm,
        expectedHeightCm,
        actualWidthCm,
        actualHeightCm,
        cut: piece.cut !== false,
        areaCm2: piece.cut === false ? 0 : actualWidthCm * actualHeightCm,
      };
    })
    .filter((piece) => piece.cut && piece.actualWidthCm > 0 && piece.actualHeightCm > 0);
}

function normalizeOffcuts(offcuts: CutResultOffcutInput[] = []) {
  return offcuts
    .map((offcut) => {
      const widthCm = n(offcut.widthCm);
      const heightCm = n(offcut.heightCm);
      return {
        widthCm,
        heightCm,
        areaCm2: widthCm * heightCm,
        notes: String(offcut.notes || "").trim() || null,
      };
    })
    .filter((offcut) => offcut.widthCm > 0 && offcut.heightCm > 0);
}

function brokenAreaCm2(stoneBroken?: CutResultStoneBrokenInput | null) {
  if (!stoneBroken?.enabled) return 0;
  return n(stoneBroken.widthCm) * n(stoneBroken.heightCm);
}

async function assertNoStartedImalatReleaseRisk(tx: Db, input: { atolyeId: string; isId: string }) {
  const startedImalat = await tx.phaseExecution.findFirst({
    where: {
      atolyeId: input.atolyeId,
      status: { in: ["STARTED", "PAUSED"] },
      schedulePhase: {
        phase: "IMALAT",
        workSchedule: { isId: input.isId },
      },
    },
    select: { id: true },
  });
  return startedImalat?.id ?? null;
}

export async function hasStartedImalatWithoutCutResult(
  tx: Db,
  input: { atolyeId: string; isId: string },
) {
  const executionId = await assertNoStartedImalatReleaseRisk(tx, input);
  if (!executionId) return false;
  const cutResult = await tx.phaseExecutionEvent.findFirst({
    where: { atolyeId: input.atolyeId, phaseExecutionId: executionId, eventType: "CUT_RESULT_RECORDED" },
    select: { id: true },
  });
  return !cutResult;
}

export async function completeImalatWithCutResult(input: CompleteImalatWithCutResultInput) {
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const execution = await tx.phaseExecution.findUnique({
      where: { id: input.executionId },
      include: {
        events: {
          where: { eventType: "CUT_RESULT_RECORDED" },
          select: { id: true },
          take: 1,
        },
        schedulePhase: {
          include: {
            workSchedule: {
              include: {
                is: {
                  select: {
                    id: true,
                    atolyeId: true,
                    musteriAdi: true,
                    urunAdi: true,
                    stoneSource: true,
                    plakaLayoutJson: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!execution) throw new ExecutionError("Execution bulunamadı", 404);
    if (execution.atolyeId !== input.atolyeId) throw new ExecutionError("Yetkisiz", 403);
    if (execution.schedulePhase.phase !== PhaseType.IMALAT) {
      throw new ExecutionError("Kesim sonucu sadece imalat fazında kaydedilebilir", 400);
    }
    if (!["STARTED", "PAUSED"].includes(execution.status)) {
      throw new ExecutionError("Kesim sonucu sadece başlatılmış imalat için kaydedilebilir", 409);
    }
    if (execution.events.length > 0) {
      throw new ExecutionError("Bu imalat için kesim sonucu zaten kaydedilmiş", 409);
    }

    const job = execution.schedulePhase.workSchedule.is;
    if (job.atolyeId !== input.atolyeId) throw new ExecutionError("Yetkisiz", 403);

    const reservations = await tx.stockReservation.findMany({
      where: { atolyeId: input.atolyeId, isId: job.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });

    if (reservations.length === 0) {
      if (job.stoneSource === "STOCK") {
        throw new ExecutionError("Bu stoklu iş için aktif rezervasyon bulunamadı", 409);
      }
      throw new ExecutionError("Stok rezervasyonu olmayan işler eski tamamlama akışıyla kapatılmalı", 400);
    }
    if (reservations.length > 1) {
      throw new ExecutionError("V1 sadece tek aktif plaka rezervasyonunu destekler", 409);
    }

    const reservation = reservations[0];
    const plate = await tx.stockPlate.findFirst({
      where: { id: reservation.stockPlateId, atolyeId: input.atolyeId },
    });
    if (!plate) throw new ExecutionError("Rezerve plaka bulunamadı", 404);

    const pieces = normalizePieces(input.pieces);
    if (pieces.length === 0) {
      throw new ExecutionError("Kesilen parça bilgisi gerekli", 400);
    }
    const offcuts = normalizeOffcuts(input.offcuts);

    const parentArea = n(plate.totalAreaCm2) || n(plate.widthCm) * n(plate.heightCm);
    const parentCost = n(plate.purchaseTotalCost);
    const costPerCm2 = parentArea > 0 ? parentCost / parentArea : 0;
    const cutAreaCm2 = pieces.reduce((sum, piece) => sum + piece.areaCm2, 0);
    const offcutAreaCm2 = offcuts.reduce((sum, offcut) => sum + offcut.areaCm2, 0);
    const brokenArea = brokenAreaCm2(input.stoneBroken);
    const computedWasteAreaCm2 = Math.max(0, parentArea - cutAreaCm2 - offcutAreaCm2);
    const fireAreaCm2 = Math.max(computedWasteAreaCm2, brokenArea);

    if (parentArea <= 0) throw new ExecutionError("Parent plaka alanı geçersiz", 400);
    if (cutAreaCm2 + offcutAreaCm2 > parentArea) {
      throw new ExecutionError("Kesilen parça ve offcut alanı parent plaka alanını aşıyor", 422);
    }

    const offcutTotalCost = offcutAreaCm2 * costPerCm2;
    const consumedAreaCm2 = Math.max(0, parentArea - offcutAreaCm2);
    const consumedCost = Math.max(0, parentCost - offcutTotalCost);
    const fireCost = fireAreaCm2 * costPerCm2;

    const lockResult = await tx.phaseExecution.updateMany({
      where: { id: execution.id, status: execution.status },
      data: {
        status: "COMPLETED",
        actualEndedAt: now,
        actualMinutes: execution.actualStartedAt
          ? computeWorkMinutes(execution.actualStartedAt, now, execution.pauseMinutes ?? 0)
          : execution.actualMinutes,
      },
    });
    if (lockResult.count === 0) {
      throw new ExecutionError("Eşzamanlı güncelleme çakışması, lütfen tekrar deneyin", 409);
    }

    await tx.phaseExecutionEvent.create({
      data: {
        phaseExecutionId: execution.id,
        schedulePhaseId: execution.schedulePhaseId,
        personelId: input.personelId ?? null,
        atolyeId: input.atolyeId,
        eventType: "CUT_RESULT_RECORDED",
        note: input.note ?? null,
        ...actorFields(input.personelId, input.userId),
        operationStep: "DIGER",
        fromStatus: execution.status,
        toStatus: "COMPLETED",
        metadata: {
          jobId: job.id,
          stockPlateId: plate.id,
          pieces,
          offcuts,
          stoneBroken: input.stoneBroken ?? null,
          parentAreaCm2: parentArea,
          cutAreaCm2,
          offcutAreaCm2,
          fireAreaCm2,
          consumedAreaCm2,
          consumedCost,
          offcutTotalCost,
          fireCost,
        },
      },
    });

    await tx.phaseExecutionEvent.create({
      data: {
        phaseExecutionId: execution.id,
        schedulePhaseId: execution.schedulePhaseId,
        personelId: input.personelId ?? null,
        atolyeId: input.atolyeId,
        eventType: "COMPLETED",
        note: input.note ?? null,
        ...actorFields(input.personelId, input.userId),
        operationStep: "DIGER",
        fromStatus: execution.status,
        toStatus: "COMPLETED",
      },
    });

    const reservationUpdate = await tx.stockReservation.updateMany({
      where: { id: reservation.id, status: "ACTIVE" },
      data: { status: "CONSUMED", consumedAt: now },
    });
    if (reservationUpdate.count === 0) {
      throw new ExecutionError("Rezervasyon eşzamanlı değişti, lütfen tekrar deneyin", 409);
    }

    const consumeMovement = await tx.stockMovement.create({
      data: {
        atolyeId: input.atolyeId,
        stockPlateId: plate.id,
        movementType: "CONSUME",
        quantityAreaCm2: decimal(consumedAreaCm2),
        isId: job.id,
        reasonCode: "CUT_RESULT_CONSUMED",
        note: "Kesim sonucu ile stok tüketildi",
      },
    });

    const materialConsumption = await tx.materialConsumption.create({
      data: {
        atolyeId: input.atolyeId,
        isId: job.id,
        stockPlateId: plate.id,
        areaCm2: decimal(consumedAreaCm2),
        costAmount: decimal(consumedCost),
        currency: plate.purchaseCurrency ?? "TRY",
        source: "CUT_RESULT",
      },
    });

    const existingOffcutCount = await tx.stockOffcut.count({
      where: { atolyeId: input.atolyeId, parentPlateId: plate.id },
    });

    const createdOffcuts = [];
    const offcutMovements = [];
    for (let i = 0; i < offcuts.length; i += 1) {
      const offcut = offcuts[i];
      const totalCost = offcut.areaCm2 * costPerCm2;
      const areaM2 = offcut.areaCm2 / 10_000;
      const created = await tx.stockOffcut.create({
        data: {
          atolyeId: input.atolyeId,
          parentPlateId: plate.id,
          offcutCode: offcutCode(plate.plateCode, existingOffcutCount + i),
          warehouseId: plate.warehouseId,
          productName: plate.productName,
          materialType: plate.materialType,
          widthCm: decimal(offcut.widthCm),
          heightCm: decimal(offcut.heightCm),
          areaCm2: decimal(offcut.areaCm2),
          remainingAreaCm2: decimal(offcut.areaCm2),
          costPerM2: decimal(areaM2 > 0 ? totalCost / areaM2 : 0),
          totalCost: decimal(totalCost),
          currency: plate.purchaseCurrency ?? "TRY",
          status: "AVAILABLE",
          sourceJobId: job.id,
          notes: offcut.notes,
        },
      });
      createdOffcuts.push(created);
      offcutMovements.push(
        await tx.stockMovement.create({
          data: {
            atolyeId: input.atolyeId,
            stockPlateId: plate.id,
            offcutId: created.id,
            movementType: "OFFCUT_CREATE",
            quantityAreaCm2: decimal(offcut.areaCm2),
            toWarehouseId: plate.warehouseId,
            isId: job.id,
            reasonCode: "CUT_RESULT_OFFCUT_CREATED",
            note: `Kesim sonucundan offcut oluşturuldu: ${created.offcutCode}`,
          },
        }),
      );
    }

    let fireRecord = null;
    let fireMovement = null;
    if (fireAreaCm2 > 0 || input.stoneBroken?.enabled) {
      const fireType = input.stoneBroken?.enabled ? "STONE_BROKEN_IN_CUTTING" : "CUTTING_WASTE";
      fireRecord = await tx.fireRecord.create({
        data: {
          atolyeId: input.atolyeId,
          isId: job.id,
          phaseExecutionId: execution.id,
          stockPlateId: plate.id,
          fireType,
          status: "RESOLVED",
          reasonCode: fireType,
          areaCm2: decimal(fireAreaCm2),
          estimatedCost: decimal(fireCost),
          finalCost: decimal(fireCost),
          currency: plate.purchaseCurrency ?? "TRY",
          note: input.stoneBroken?.description || input.note || null,
          resolvedAt: now,
        },
      });

      fireMovement = await tx.stockMovement.create({
        data: {
          atolyeId: input.atolyeId,
          stockPlateId: plate.id,
          movementType: "CUTTING_WASTE",
          quantityAreaCm2: decimal(fireAreaCm2),
          isId: job.id,
          reasonCode: fireType,
          note: input.stoneBroken?.description || "Kesim sonucu fire",
        },
      });

      if (fireCost > 0) {
        await tx.is.update({
          where: { id: job.id },
          data: {
            operasyonelFireMaliyeti: { increment: decimal(fireCost) },
            toplamMaliyet: { increment: decimal(fireCost) },
          },
        });
      }
    }

    await tx.stockPlate.update({
      where: { id: plate.id },
      data: { status: "USED", remainingAreaCm2: decimal(0) },
    });

    await tx.schedulePhase.update({
      where: { id: execution.schedulePhaseId },
      data: { isCompleted: true, completedAt: now, completedBy: input.personelId ?? null },
    });

    const updatedExecution = await tx.phaseExecution.findUniqueOrThrow({ where: { id: execution.id } });

    return {
      execution: updatedExecution,
      reservationId: reservation.id,
      materialConsumption,
      movements: [consumeMovement, ...offcutMovements, ...(fireMovement ? [fireMovement] : [])],
      offcuts: createdOffcuts,
      fireRecord,
    };
  });
}

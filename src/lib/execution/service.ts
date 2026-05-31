import { PhaseExecutionStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { sseEmitter } from "@/lib/sseEmitter"
import { logActivity } from "@/lib/activityLogger"
import {
  notifyInstallationCompleted,
  notifyPhaseCompleted,
  notifyProductionOperationCompleted,
  notifyProductionOperationReady,
  notifyStoneBrokenInCutting,
} from "@/lib/scheduleNotifications"
import { canTransition, eventTypeForTransition } from "./transitions"

// ─── Working-hours constants (Istanbul UTC+3, fixed shift) ────────────────────
const WORK_TZ_OFFSET_MIN = 180                                   // UTC+3
const WORK_DAY_MIN = 1440
const WORK_WINDOWS: [number, number][] = [[480, 720], [780, 1080]] // 08-12, 13-18

// Segment-based (day-by-day, not minute-by-minute) work-calendar minutes.
// Covers Pazartesi–Cuma, 08:00–12:00 and 13:00–18:00 (UTC+3, fixed).
// pauseMinutes subtracted at the end (wall-clock pause; typically short/in-shift).
export function computeWorkMinutes(
  startAt: Date,
  endAt: Date,
  pauseMinutes = 0,
): number {
  if (endAt <= startAt) return 0
  const toLocal = (d: Date) => Math.floor(d.getTime() / 60_000) + WORK_TZ_OFFSET_MIN
  const s = toLocal(startAt)
  const e = toLocal(endAt)
  const startDay = Math.floor(s / WORK_DAY_MIN) * WORK_DAY_MIN
  const endDay   = Math.floor(e / WORK_DAY_MIN) * WORK_DAY_MIN
  let work = 0
  for (let day = startDay; day <= endDay; day += WORK_DAY_MIN) {
    // epoch local-day 0 = Jan 1 1970 UTC+3 = Thursday (dow 4)
    const dow = (day / WORK_DAY_MIN + 4) % 7  // 0=Sun, 1=Mon … 6=Sat
    if (dow === 0 || dow === 6) continue
    for (const [wS, wE] of WORK_WINDOWS) {
      const from = Math.max(day + wS, s)
      const to   = Math.min(day + wE, e)
      if (to > from) work += to - from
    }
  }
  return Math.max(0, work - pauseMinutes)
}

// Elapsed work minutes for an active execution (live display + risk state).
export function computeElapsedMinutes(
  actualStartedAt: Date | null | undefined,
  pauseMinutes: number | null | undefined,
): number {
  if (!actualStartedAt) return 0
  return computeWorkMinutes(new Date(actualStartedAt), new Date(), pauseMinutes ?? 0)
}

// ─── Risk state helpers ───────────────────────────────────────────────────────

export type RiskState = "NO_PLAN" | "NORMAL" | "OVERRUN" | "CRITICAL" | "STALE"

export function computeRiskState(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): RiskState {
  if (elapsedMinutes > 600) return "STALE"
  if (!expectedMinutes || expectedMinutes <= 0) return "NO_PLAN"
  const ratio = elapsedMinutes / expectedMinutes
  if (ratio <= 1.0) return "NORMAL"
  if (ratio <= 1.25) return "OVERRUN"
  return "CRITICAL"
}

export function computeVariance(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): number | null {
  if (!expectedMinutes || expectedMinutes <= 0) return null
  return elapsedMinutes - expectedMinutes
}

export function computeProgressRatio(
  elapsedMinutes: number,
  expectedMinutes: number | null | undefined,
): number | null {
  if (!expectedMinutes || expectedMinutes <= 0) return null
  return elapsedMinutes / expectedMinutes
}

// ─── Public error ─────────────────────────────────────────────────────────────

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message)
    this.name = "ExecutionError"
  }
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateExecutionInput {
  schedulePhaseId: string
  phaseOperationId?: string | null
  atolyeId: string
  personelId?: string | null
  plannedStartAt?: Date | null
  plannedEndAt?: Date | null
  estimatedMinutes?: number | null
  note?: string | null
}

export interface TransitionInput {
  executionId: string
  atolyeId: string           // ownership re-check burada da yapılır
  toStatus: PhaseExecutionStatus
  personelId?: string | null
  userId?: string | null
  note?: string | null
  cannotStartReason?: string | null
  failureDescription?: string | null
  materialLossCost?: number | null
  mtul?: number | null
}

function resolveActorAuditFields(
  personelId?: string | null,
  userId?: string | null,
) {
  if (personelId) {
    return {
      actorType: "PERSONEL",
      actorPersonelId: personelId,
      actorUserId: null,
    }
  }
  if (userId) {
    return {
      actorType: "USER",
      actorPersonelId: null,
      actorUserId: userId,
    }
  }
  return {
    actorType: "SYSTEM",
    actorPersonelId: null,
    actorUserId: null,
  }
}

function operationStepForPhase(phase?: string | null) {
  if (phase === "OLCU") return "OLCU"
  if (phase === "MONTAJ") return "MONTAJ"
  return "DIGER"
}

function canUseStoneBrokenReason(
  phase: string | null | undefined,
  phaseOperation: { operationType: string } | null | undefined,
) {
  if (phaseOperation) return phaseOperation.operationType === "KESIM"
  return phase === "IMALAT"
}

// ─── createExecution ──────────────────────────────────────────────────────────
// Her zaman PLANNED durumunda başlar.
// Tek personel owner şu an; schema multi-staff'a kapalı değil.

const ACTIVE_STATUSES: PhaseExecutionStatus[] = [
  "PLANNED",
  "STARTED",
  "PAUSED",
  "CANNOT_START",
]

export async function createExecution(input: CreateExecutionInput) {
  const {
    schedulePhaseId,
    phaseOperationId,
    atolyeId,
    personelId,
    plannedStartAt,
    plannedEndAt,
    estimatedMinutes,
    note,
  } = input

  // Aynı faz için zaten aktif bir execution varsa yeni kayıt açma.
  // Transaction içinde: check + create atomik — race condition guard.
  const execution = await prisma.$transaction(async (tx) => {
    const phaseOperation = phaseOperationId
      ? await tx.schedulePhaseOperation.findUnique({
          where: { id: phaseOperationId },
          select: { id: true, schedulePhaseId: true, status: true },
        })
      : null

    if (phaseOperationId && !phaseOperation) {
      throw new ExecutionError("Operasyon bulunamadı", 404)
    }
    if (phaseOperation && phaseOperation.schedulePhaseId !== schedulePhaseId) {
      throw new ExecutionError("Operasyon bu faza ait değil", 400)
    }
    if (phaseOperation && phaseOperation.status !== "READY") {
      throw new ExecutionError("Operasyon başlatılmaya hazır değil", 409)
    }

    const existing = await tx.phaseExecution.findFirst({
      where: phaseOperationId
        ? {
            atolyeId,
            status: { in: ACTIVE_STATUSES },
            OR: [
              { phaseOperationId },
              { schedulePhaseId, phaseOperationId: null },
            ],
          }
        : {
            schedulePhaseId,
            atolyeId,
            status: { in: ACTIVE_STATUSES },
            OR: [
              { phaseOperationId: null },
              { phaseOperationId: { not: null } },
            ],
          },
    })
    if (existing) {
      throw new ExecutionError(
        "Bu faz için zaten aktif bir operasyon kaydı var",
        409,
      )
    }

    return tx.phaseExecution.create({
      data: {
        schedulePhaseId,
        phaseOperationId: phaseOperationId ?? null,
        atolyeId,
        personelId: personelId ?? null,
        status: "PLANNED",
        plannedStartAt: plannedStartAt ?? null,
        plannedEndAt: plannedEndAt ?? null,
        estimatedMinutes: estimatedMinutes ?? null,
      },
    })
  })

  const phaseForAudit = await prisma.schedulePhase.findUnique({
    where: { id: schedulePhaseId },
    select: { phase: true },
  })

  // CREATED event — immutable log başlangıcı (transaction dışı, ok)
  await prisma.phaseExecutionEvent.create({
    data: {
      phaseExecutionId: execution.id,
      schedulePhaseId,
      phaseOperationId: phaseOperationId ?? null,
      personelId: personelId ?? null,
      atolyeId,
      eventType: "CREATED",
      note: note ?? null,
      ...resolveActorAuditFields(personelId),
      operationStep: operationStepForPhase(phaseForAudit?.phase),
      fromStatus: null,
      toStatus: "PLANNED",
    },
  })

  return execution
}

// ─── transitionExecution ──────────────────────────────────────────────────────
// Tüm status geçişleri buradan geçer.
// Event log immutable — update/delete yok, sadece append.

export async function transitionExecution(input: TransitionInput) {
  const {
    executionId,
    atolyeId,
    toStatus,
    personelId,
    userId,
    note,
    cannotStartReason,
    failureDescription,
    materialLossCost,
    mtul,
  } = input

  const execution = await prisma.phaseExecution.findUnique({
    where: { id: executionId },
    include: {
      schedulePhase: {
        select: {
          phase: true,
          workSchedule: {
            select: {
              id: true,
              isId: true,
              is: { select: { stoneSource: true } },
            },
          },
        },
      },
      phaseOperation: {
        select: {
          id: true,
          operationType: true,
          status: true,
        },
      },
    },
  })

  if (!execution) throw new ExecutionError("Execution bulunamadı", 404)
  if (execution.atolyeId !== atolyeId) throw new ExecutionError("Yetkisiz", 403)

  if (!canTransition(execution.status, toStatus)) {
    throw new ExecutionError(
      `${execution.status} → ${toStatus} geçişine izin verilmiyor`,
      400,
    )
  }

  if (
    execution.phaseOperationId &&
    toStatus === "STARTED" &&
    execution.phaseOperation?.status !== "READY" &&
    execution.phaseOperation?.status !== "PAUSED"
  ) {
    throw new ExecutionError("Operasyon başlatılmaya hazır değil", 409)
  }

  if (
    toStatus === "CANNOT_START" &&
    cannotStartReason === "STONE_BROKEN_IN_CUTTING" &&
    !canUseStoneBrokenReason(execution.schedulePhase?.phase, execution.phaseOperation)
  ) {
    throw new ExecutionError("Kesimde taş kırıldı nedeni sadece kesim operasyonunda kullanılabilir", 400)
  }

  const now = new Date()

  // ── Pause accumulation — BEFORE switch so COMPLETED sees the updated value ─
  // Runs whenever leaving PAUSED state (→ STARTED, COMPLETED, CANCELLED).
  let effectivePauseMinutes = execution.pauseMinutes ?? 0
  if (execution.status === "PAUSED") {
    const lastPause = await prisma.phaseExecutionEvent.findFirst({
      where: { phaseExecutionId: executionId, eventType: "PAUSED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    if (lastPause) {
      effectivePauseMinutes += Math.max(
        0,
        Math.round((now.getTime() - lastPause.createdAt.getTime()) / 60_000),
      )
    }
  }

  // ── Status'a göre alan güncellemeleri ────────────────────────────────────
  const update: Record<string, unknown> = { status: toStatus }
  if (execution.status === "PAUSED") update.pauseMinutes = effectivePauseMinutes

  switch (toStatus) {
    case "STARTED":
      if (!execution.actualStartedAt) {
        update.actualStartedAt = now
      }
      break

    case "COMPLETED":
      update.actualEndedAt = now
      if (execution.actualStartedAt) {
        update.actualMinutes = computeWorkMinutes(execution.actualStartedAt, now, effectivePauseMinutes)
      }
      if (mtul != null) update.mtul = mtul
      break

    case "CANNOT_START":
      if (cannotStartReason) update.cannotStartReason = cannotStartReason
      if (failureDescription) update.failureDescription = failureDescription
      if (materialLossCost != null) update.materialLossCost = materialLossCost
      break

    case "PAUSED":
    case "CANCELLED":
      break
  }

  const eventType = eventTypeForTransition(execution.status, toStatus)
  const fromStatus = execution.status // optimistic lock için snapshot

  // ── Atomic: optimistic lock + immutable event append ─────────────────────
  // updateMany ile { id, status: fromStatus } — eşzamanlı başka bir PATCH
  // status'u değiştirdiyse count === 0 gelir ve 409 fırlatılır.
  const transactionResult = await prisma.$transaction(async (tx) => {
    let toplamaReadyNotification:
      | {
          targetOperationId: string
          workScheduleId: string
          jobId: string
          schedulePhaseId: string
        }
      | null = null
    let cuttingReadyNotification:
      | {
          targetOperationId: string
          workScheduleId: string
          jobId: string
          schedulePhaseId: string
        }
      | null = null
    let parentPhaseCompleted = false

    const result = await tx.phaseExecution.updateMany({
      where: { id: executionId, status: fromStatus },
      data: update,
    })

    if (result.count === 0) {
      throw new ExecutionError(
        "Eşzamanlı güncelleme çakışması, lütfen tekrar deneyin",
        409,
      )
    }

    await tx.phaseExecutionEvent.create({
      data: {
        phaseExecutionId: executionId,
        schedulePhaseId: execution.schedulePhaseId,
        phaseOperationId: execution.phaseOperationId ?? null,
        personelId: personelId ?? null,
        atolyeId,
        eventType,
        note: note ?? null,
        ...resolveActorAuditFields(personelId, userId),
        operationStep: operationStepForPhase(execution.schedulePhase?.phase),
        fromStatus,
        toStatus,
        reasonCode: toStatus === "CANNOT_START" ? cannotStartReason : null,
        costType: toStatus === "CANNOT_START" && materialLossCost != null ? "MATERIAL_LOSS" : null,
        costAmount: toStatus === "CANNOT_START" && materialLossCost != null ? materialLossCost : null,
        currency: toStatus === "CANNOT_START" && materialLossCost != null ? "TRY" : null,
        metadata:
          toStatus === "CANNOT_START"
            ? {
                ...(cannotStartReason ? { cannotStartReason } : {}),
                ...(failureDescription ? { failureDescription } : {}),
                ...(materialLossCost != null ? { materialLossCost } : {}),
              }
            : toStatus === "COMPLETED" && execution.phaseOperation?.operationType === "KESIM"
              ? {
                  sourceOperationType: "KESIM",
                  targetOperationType: "TOPLAMA",
                }
            : undefined,
      },
    })

    const jobId = execution.schedulePhase.workSchedule.isId

    if (execution.phaseOperationId) {
      if (toStatus === "STARTED") {
        await tx.schedulePhaseOperation.updateMany({
          where: {
            id: execution.phaseOperationId,
            status: { in: ["READY", "PAUSED"] },
          },
          data: {
            status: "STARTED",
            startedAt: now,
          },
        })
      }

      if (toStatus === "PAUSED") {
        await tx.schedulePhaseOperation.updateMany({
          where: {
            id: execution.phaseOperationId,
            status: "STARTED",
          },
          data: {
            status: "PAUSED",
          },
        })
      }

      if (toStatus === "CANNOT_START") {
        await tx.schedulePhaseOperation.updateMany({
          where: {
            id: execution.phaseOperationId,
            status: { in: ["READY", "STARTED", "PAUSED"] },
          },
          data: {
            status: "CANNOT_START",
          },
        })
      }
    }

    if (
      toStatus === "CANNOT_START" &&
      cannotStartReason === "STONE_BROKEN_IN_CUTTING" &&
      materialLossCost != null
    ) {
      const reservation = await tx.stockReservation.findFirst({
        where: {
          atolyeId,
          isId: jobId,
          status: { in: ["CONSUMED", "ACTIVE"] },
        },
        orderBy: { updatedAt: "desc" },
        select: { stockPlateId: true },
      })

      await tx.fireRecord.create({
        data: {
          atolyeId,
          isId: jobId,
          phaseExecutionId: executionId,
          phaseOperationId: execution.phaseOperationId ?? null,
          stockPlateId: reservation?.stockPlateId ?? null,
          fireType: "STONE_BROKEN_IN_CUTTING",
          status: "RESOLVED",
          reasonCode: cannotStartReason,
          estimatedCost: materialLossCost,
          finalCost: materialLossCost,
          currency: "TRY",
          note: failureDescription ?? null,
          resolvedAt: now,
        },
      })

      await tx.is.update({
        where: { id: jobId },
        data: {
          operasyonelFireMaliyeti: { increment: materialLossCost },
          toplamMaliyet: { increment: materialLossCost },
        },
      })
    }

    if (toStatus === "COMPLETED") {
      if (execution.phaseOperationId) {
        await tx.schedulePhaseOperation.updateMany({
          where: {
            id: execution.phaseOperationId,
            status: { in: ["PLANNED", "READY", "STARTED", "PAUSED"] },
          },
          data: {
            status: "COMPLETED",
            completedAt: now,
            completedBy: personelId ?? null,
          },
        })

        if (execution.phaseOperation?.operationType === "KESIM") {
          const toplamaOperation = await tx.schedulePhaseOperation.findUnique({
            where: {
              schedulePhaseId_operationType: {
                schedulePhaseId: execution.schedulePhaseId,
                operationType: "TOPLAMA",
              },
            },
            select: {
              id: true,
              schedulePhaseId: true,
              schedulePhase: {
                select: {
                  workScheduleId: true,
                  workSchedule: { select: { isId: true } },
                },
              },
            },
          })

          const toplamaReadyResult = await tx.schedulePhaseOperation.updateMany({
            where: {
              schedulePhaseId: execution.schedulePhaseId,
              operationType: "TOPLAMA",
              status: "PLANNED",
            },
            data: {
              status: "READY",
              readyAt: now,
            },
          })

          if (toplamaOperation && toplamaReadyResult.count > 0) {
            toplamaReadyNotification = {
              targetOperationId: toplamaOperation.id,
              workScheduleId: toplamaOperation.schedulePhase.workScheduleId,
              jobId: toplamaOperation.schedulePhase.workSchedule.isId,
              schedulePhaseId: toplamaOperation.schedulePhaseId,
            }
          }
        }

        if (execution.phaseOperation?.operationType === "TOPLAMA") {
          const siblingOperations = await tx.schedulePhaseOperation.findMany({
            where: {
              schedulePhaseId: execution.schedulePhaseId,
              operationType: { in: ["KESIM", "TOPLAMA"] },
            },
            select: { operationType: true, status: true },
          })
          const operationStatus = new Map(
            siblingOperations.map((operation) => [operation.operationType, operation.status]),
          )
          const productionComplete =
            operationStatus.get("KESIM") === "COMPLETED" &&
            operationStatus.get("TOPLAMA") === "COMPLETED"

          if (productionComplete) {
            const parentResult = await tx.schedulePhase.updateMany({
              where: {
                id: execution.schedulePhaseId,
                isCompleted: false,
              },
              data: {
                isCompleted: true,
                completedAt: now,
                completedBy: personelId ?? null,
              },
            })
            parentPhaseCompleted = parentResult.count > 0
          }
        }
      } else {
        await tx.schedulePhase.update({
          where: { id: execution.schedulePhaseId },
          data: { isCompleted: true, completedAt: now, completedBy: personelId ?? null },
        })
        // MONTAJ tamamlandığında işi montaj_tamamlandi yap (togglePhaseCompletion ile tutarlı).
        const phaseInfo = await tx.schedulePhase.findUnique({
          where: { id: execution.schedulePhaseId },
          select: { phase: true, workScheduleId: true, workSchedule: { select: { isId: true } } },
        })
        if (phaseInfo?.phase === "OLCU") {
          const imalatPhase = await tx.schedulePhase.findUnique({
            where: {
              workScheduleId_phase: {
                workScheduleId: phaseInfo.workScheduleId,
                phase: "IMALAT",
              },
            },
            select: { id: true },
          })
          if (imalatPhase) {
            const kesimOperation = await tx.schedulePhaseOperation.findUnique({
              where: {
                schedulePhaseId_operationType: {
                  schedulePhaseId: imalatPhase.id,
                  operationType: "KESIM",
                },
              },
              select: { id: true },
            })
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
            })
            if (kesimOperation && readyResult.count > 0) {
              cuttingReadyNotification = {
                targetOperationId: kesimOperation.id,
                workScheduleId: phaseInfo.workScheduleId,
                jobId: phaseInfo.workSchedule.isId,
                schedulePhaseId: imalatPhase.id,
              }
            }
          }
        }
        if (phaseInfo?.phase === "MONTAJ") {
          await tx.is.update({
            where: { id: phaseInfo.workSchedule.isId },
            data: { durum: "montaj_tamamlandi" },
          })
        }
      }
    }

    const updatedExecution = await tx.phaseExecution.findUniqueOrThrow({ where: { id: executionId } })
    return { updatedExecution, toplamaReadyNotification, cuttingReadyNotification, parentPhaseCompleted }
  })

  const updated = transactionResult.updatedExecution

  // SSE execution_status — live-ops paneli invalidate eder (fire-and-forget).
  // Vercel multi-instance'da kayıp olabilir; polling fallback (10s) devreye girer.
  sseEmitter.emit(`activity:${atolyeId}`, {
    type: "execution_status",
    execId: executionId,
    phaseId: execution.schedulePhaseId,
    toStatus,
  })

  // Activity log.
  // ActivityLog DB + Notification + SSE(type=activity) → dashboard canlı akış + toast.
  try {
    const FAZ_LABEL: Record<string, string> = {
      IMALAT: "imalat", MONTAJ: "montaj", OLCU: "ölçü", TAS_ALINACAK: "taş alınacak",
    }
    const CANNOT_START_LABELS: Record<string, string> = {
      CUSTOMER_NOT_READY:      "Müşteri hazır değil",
      MATERIAL_MISSING:        "Malzeme eksik",
      MEASUREMENT_MISSING:     "Ölçü eksik",
      MACHINE_BUSY:            "Makine meşgul",
      PERSONNEL_UNAVAILABLE:   "Personel yok",
      SITE_NOT_READY:          "Saha hazır değil",
      STONE_BROKEN_IN_CUTTING: "Kesimde taş kırıldı",
      OTHER:                   "Diğer",
    }
    const isResumed = toStatus === "STARTED" && fromStatus === "PAUSED"
    const actType = isResumed
      ? "execution_resumed"
      : `execution_${String(toStatus).toLowerCase()}`

    const [phaseCtx, actorName] = await Promise.all([
      prisma.schedulePhase.findUnique({
        where: { id: execution.schedulePhaseId },
        select: {
          phase: true,
          workScheduleId: true,
          workSchedule: {
            select: {
              id: true,
              isId: true,
              is: { select: { musteriAdi: true, urunAdi: true } },
            },
          },
        },
      }),
      personelId
        ? prisma.personel
            .findUnique({ where: { id: personelId }, select: { ad: true, soyad: true } })
            .then((p) => (p ? `${p.ad}${p.soyad ? " " + p.soyad : ""}`.trim() : null))
        : userId
        ? prisma.user
            .findUnique({ where: { id: userId }, select: { ad: true } })
            .then((u) => u?.ad || "Admin")
        : Promise.resolve(null),
    ])

    const fazLabel = FAZ_LABEL[phaseCtx?.phase ?? ""] ?? "faz"
    const musteriAdi = phaseCtx?.workSchedule?.is?.musteriAdi || "—"
    const jobName = phaseCtx?.workSchedule?.is?.urunAdi || musteriAdi
    const actorLabel = actorName || "Atölye"
    const reasonSuffix = toStatus === "CANNOT_START" && cannotStartReason
      ? ` (${CANNOT_START_LABELS[cannotStartReason] ?? cannotStartReason})`
      : ""
    const deepLink = `/dashboard/is-programi?phaseId=${execution.schedulePhaseId}`
    const actorId = personelId ?? userId ?? null
    const workScheduleId = phaseCtx?.workSchedule?.id ?? execution.schedulePhase.workSchedule.id
    const jobId = phaseCtx?.workSchedule?.isId ?? execution.schedulePhase.workSchedule.isId
    const phaseType = phaseCtx?.phase ?? execution.schedulePhase?.phase ?? null
    const baseScheduleContext = {
      atolyeId,
      userId: userId ?? undefined,
      personelId: personelId ?? undefined,
      actorId,
      actorName: actorName ?? null,
      jobId,
      jobName,
      customerName: musteriAdi,
      workScheduleId,
      phaseId: execution.schedulePhaseId,
      phaseType: phaseType ?? "UNKNOWN",
    }

    if (transactionResult.toplamaReadyNotification) {
      const toplamaReady = transactionResult.toplamaReadyNotification
      await notifyProductionOperationReady({
        ...baseScheduleContext,
        jobId: toplamaReady.jobId,
        workScheduleId: toplamaReady.workScheduleId,
        phaseId: toplamaReady.schedulePhaseId,
        phaseType: "IMALAT",
        phaseOperationId: toplamaReady.targetOperationId,
        operationType: "TOPLAMA",
      })
    }

    if (transactionResult.cuttingReadyNotification) {
      const cuttingReady = transactionResult.cuttingReadyNotification
      await notifyProductionOperationReady({
        ...baseScheduleContext,
        jobId: cuttingReady.jobId,
        workScheduleId: cuttingReady.workScheduleId,
        phaseId: cuttingReady.schedulePhaseId,
        phaseType: "IMALAT",
        phaseOperationId: cuttingReady.targetOperationId,
        operationType: "KESIM",
      })
    }

    const MSG: Record<string, string> = {
      execution_started:      `${actorLabel} — ${musteriAdi} ${fazLabel} fazını başlattı`,
      execution_resumed:      `${actorLabel} — ${musteriAdi} ${fazLabel} fazını devam ettirdi`,
      execution_paused:       `${actorLabel} — ${musteriAdi} ${fazLabel} fazını duraklattı`,
      execution_completed:    `${actorLabel} — ${musteriAdi} ${fazLabel} fazını tamamladı`,
      execution_cancelled:    `${actorLabel} — ${musteriAdi} ${fazLabel} fazı iptal edildi`,
      execution_cannot_start: `${actorLabel} — ${musteriAdi} ${fazLabel} fazı başlatılamadı${reasonSuffix}`,
    }

    const message = MSG[actType] ?? `${actorLabel} — ${musteriAdi} ${fazLabel} durumu değişti`

    if (toStatus === "CANNOT_START") {
      if (
        cannotStartReason === "STONE_BROKEN_IN_CUTTING" &&
        execution.phaseOperationId &&
        execution.phaseOperation?.operationType === "KESIM"
      ) {
        await notifyStoneBrokenInCutting({
          ...baseScheduleContext,
          phaseOperationId: execution.phaseOperationId,
          operationType: "KESIM",
          reasonCode: cannotStartReason,
          failureDescription: failureDescription ?? null,
          materialLossCost: materialLossCost ?? null,
        })
      } else {
        await logActivity({
          atolyeId,
          personelId: personelId ?? undefined,
          userId: userId ?? undefined,
          type: actType,
          message,
          refId: executionId,
          url: deepLink,
          awaitPush: true,
        })
      }
    } else if (toStatus === "COMPLETED") {
      if (execution.phaseOperationId && execution.phaseOperation?.operationType) {
        await notifyProductionOperationCompleted({
          ...baseScheduleContext,
          phaseOperationId: execution.phaseOperationId,
          operationType: execution.phaseOperation.operationType,
        })
        if (execution.phaseOperation.operationType === "TOPLAMA" && transactionResult.parentPhaseCompleted) {
          await notifyPhaseCompleted(baseScheduleContext)
        }
      } else if (phaseType === "MONTAJ") {
        await notifyInstallationCompleted(baseScheduleContext)
      } else {
        await notifyPhaseCompleted(baseScheduleContext)
      }
    } else {
      await logActivity({
        atolyeId,
        personelId: personelId ?? undefined,
        userId: userId ?? undefined,
        type: actType,
        message,
        refId: executionId,
        url: deepLink,
        awaitPush: true,
      })
    }
  } catch (error) {
    console.warn("execution activity notification failed:", error)
  }

  return updated
}

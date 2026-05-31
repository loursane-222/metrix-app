import { NextRequest, NextResponse } from "next/server"
import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma"
import { createExecution, ExecutionError } from "@/lib/execution/service"
import { getCurrentExecutionForPhase } from "@/lib/execution/queries"

function minutes(value: unknown) {
  const n = Number(value || 0)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}

function isCuttingOperationType(value: unknown) {
  const key = String(value || "").toLocaleLowerCase("tr-TR")
  return key.includes("kesim") || key.includes("cut")
}

function estimateMinutesForExecution(params: {
  requestedMinutes: unknown
  totalMinutes: unknown
  phase: string
  operationType?: string | null
  operations?: Array<{ operasyonTipi: string | null; toplamDakika: unknown }>
}) {
  const requested = params.requestedMinutes != null ? minutes(params.requestedMinutes) : 0
  if (requested > 0) return requested

  const total = minutes(params.totalMinutes)
  if (total <= 0) return null

  if (params.phase !== "IMALAT") return total
  if (!params.operationType) return total

  const operationRows = params.operations || []
  const cuttingMinutes = operationRows
    .filter((operation) => isCuttingOperationType(operation.operasyonTipi))
    .reduce((sum, operation) => sum + minutes(operation.toplamDakika), 0)

  if (params.operationType === "KESIM") {
    return cuttingMinutes > 0 ? cuttingMinutes : Math.max(1, Math.round(total * 0.4))
  }

  if (params.operationType === "TOPLAMA") {
    if (cuttingMinutes > 0 && cuttingMinutes < total) return Math.max(1, total - cuttingMinutes)
    return Math.max(1, total - Math.max(1, Math.round(total * 0.4)))
  }

  return total
}

// ─── GET ─────────────────────────────────────────────────────────────────────
// ?schedulePhaseId=xxx
// Önce active (non-terminal) execution aranır;
// yoksa en son terminal execution döner; yoksa null.

export async function GET(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth()
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const schedulePhaseId = req.nextUrl.searchParams.get("schedulePhaseId") || ""
    const phaseOperationId = req.nextUrl.searchParams.get("phaseOperationId") || null
    if (!schedulePhaseId) {
      return NextResponse.json({ error: "schedulePhaseId gerekli" }, { status: 400 })
    }

    const phase = await prisma.schedulePhase.findUnique({
      where: { id: schedulePhaseId },
      include: {
        workSchedule: {
          include: { is: { select: { atolyeId: true } } },
        },
      },
    })

    if (!phase) {
      return NextResponse.json({ error: "Aşama bulunamadı" }, { status: 404 })
    }
    if (phase.workSchedule.is.atolyeId !== auth.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }

    if (phaseOperationId) {
      const operation = await prisma.schedulePhaseOperation.findFirst({
        where: { id: phaseOperationId, schedulePhaseId },
        select: { id: true },
      })
      if (!operation) {
        return NextResponse.json({ error: "Operasyon bulunamadı" }, { status: 404 })
      }
    }

    const execution = await getCurrentExecutionForPhase(schedulePhaseId, auth.atolyeId, phaseOperationId)
    return NextResponse.json({ ok: true, execution: execution ?? null })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: "Execution yüklenemedi" }, { status: 500 })
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
// Yeni PhaseExecution oluşturur — her zaman PLANNED durumunda başlar.

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth()
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await req.json()
    const schedulePhaseId = String(body.schedulePhaseId || "")
    const phaseOperationId = body.phaseOperationId ? String(body.phaseOperationId) : null
    if (!schedulePhaseId) {
      return NextResponse.json({ error: "schedulePhaseId gerekli" }, { status: 400 })
    }

    const phase = await prisma.schedulePhase.findUnique({
      where: { id: schedulePhaseId },
      include: {
        workSchedule: {
          include: {
            is: {
              select: {
                atolyeId: true,
                toplamSureDakika: true,
                operasyonlar: {
                  select: {
                    operasyonTipi: true,
                    toplamDakika: true,
                  },
                },
              },
            },
          },
        },
        operations: {
          select: {
            id: true,
            operationType: true,
          },
        },
      },
    })

    if (!phase) {
      return NextResponse.json({ error: "Aşama bulunamadı" }, { status: 404 })
    }
    if (phase.workSchedule.is.atolyeId !== auth.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 403 })
    }

    const personelId: string | null =
      body.personelId ? String(body.personelId) : (auth.personelId ?? null)

    const phaseOperation = phaseOperationId
      ? phase.operations.find((operation) => operation.id === phaseOperationId)
      : null
    const estimatedMinutes = estimateMinutesForExecution({
      requestedMinutes: body.estimatedMinutes,
      totalMinutes: phase.workSchedule.is.toplamSureDakika,
      phase: phase.phase,
      operationType: phaseOperation?.operationType ?? null,
      operations: phase.workSchedule.is.operasyonlar,
    })

    const execution = await createExecution({
      schedulePhaseId,
      phaseOperationId,
      atolyeId: auth.atolyeId,
      personelId,
      plannedStartAt: phase.plannedStart ?? null,
      plannedEndAt: phase.plannedEnd ?? null,
      estimatedMinutes,
      note: body.note ? String(body.note) : null,
    })

    return NextResponse.json({ ok: true, execution }, { status: 201 })
  } catch (e: any) {
    if (e instanceof ExecutionError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode })
    }
    console.error(e)
    return NextResponse.json({ error: "Execution oluşturulamadı" }, { status: 500 })
  }
}

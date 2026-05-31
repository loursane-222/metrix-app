import { NextResponse } from "next/server"
import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma"
import {
  computeElapsedMinutes,
  computeRiskState,
  computeVariance,
  computeProgressRatio,
} from "@/lib/execution/service"

function serializeProductionOperations(
  phaseType: string | null | undefined,
  operations:
    | Array<{
        operationType: string
        status: string
        startedAt: Date | null
        completedAt: Date | null
      }>
    | null
    | undefined,
) {
  if (phaseType !== "IMALAT") return []

  const order: Record<string, number> = { KESIM: 0, TOPLAMA: 1 }
  return [...(operations ?? [])]
    .sort((a, b) => (order[a.operationType] ?? 99) - (order[b.operationType] ?? 99))
    .map((operation) => ({
      operationType: operation.operationType,
      status: operation.status,
      startedAt: operation.startedAt?.toISOString() ?? null,
      completedAt: operation.completedAt?.toISOString() ?? null,
    }))
}

// GET /api/dashboard/live-ops
// Şu an STARTED veya PAUSED durumundaki tüm execution'ları döner.
// Polling-ready: her 10s'de bir çağrılabilir.
// İleride: SSE invalidation trigger'ı bu endpoint'i revalidate eder.

export async function GET() {
  try {
    const auth = await getAtolyeAuth()
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    // İki sorgu paralel — N+1 yok.
    const [executions, blockedExecutions] = await Promise.all([
      prisma.phaseExecution.findMany({
        where: { atolyeId: auth.atolyeId, status: { in: ["STARTED", "PAUSED"] } },
        select: {
          id: true,
          schedulePhaseId: true,
          status: true,
          actualStartedAt: true,
          pauseMinutes: true,
          estimatedMinutes: true,
          cannotStartReason: true,
          personel: { select: { ad: true, soyad: true } },
          schedulePhase: {
            select: {
              phase: true,
              operations: {
                select: {
                  operationType: true,
                  status: true,
                  startedAt: true,
                  completedAt: true,
                },
              },
              workSchedule: {
                select: { is: { select: { musteriAdi: true, urunAdi: true } } },
              },
            },
          },
        },
        orderBy: { actualStartedAt: "asc" },
      }),
      prisma.phaseExecution.findMany({
        where: { atolyeId: auth.atolyeId, status: "CANNOT_START" },
        select: {
          id: true,
          schedulePhaseId: true,
          cannotStartReason: true,
          materialLossCost: true,
          updatedAt: true,
          schedulePhase: {
            select: {
              phase: true,
              operations: {
                select: {
                  operationType: true,
                  status: true,
                  startedAt: true,
                  completedAt: true,
                },
              },
              workSchedule: {
                select: { is: { select: { musteriAdi: true, urunAdi: true } } },
              },
            },
          },
        },
        orderBy: { updatedAt: "asc" }, // en uzun süredir takılı önce
      }),
    ])

    const aktifEkip = executions.map((ex) => {
      const elapsed = computeElapsedMinutes(ex.actualStartedAt, ex.pauseMinutes)

      // estimatedMinutes null ise NO_PLAN state — toplamSureDakika fallback kaldırıldı.
      const rawExpected = ex.estimatedMinutes ?? null

      const variance = computeVariance(elapsed, rawExpected)
      const progressRatio = computeProgressRatio(elapsed, rawExpected)
      const riskState = computeRiskState(elapsed, rawExpected)

      return {
        execId: ex.id,
        phaseId: ex.schedulePhaseId,
        personelAd: ex.personel
          ? `${ex.personel.ad} ${ex.personel.soyad ?? ""}`.trim()
          : "Atanmamış",
        phaseType: ex.schedulePhase?.phase ?? "IMALAT",
        musteriAdi: ex.schedulePhase?.workSchedule?.is?.musteriAdi ?? "—",
        urunAdi: ex.schedulePhase?.workSchedule?.is?.urunAdi ?? "",
        status: ex.status as "STARTED" | "PAUSED",
        actualStartedAt: ex.actualStartedAt?.toISOString() ?? null,
        elapsedMinutes: elapsed,
        expectedMinutes: rawExpected,
        varianceMinutes: variance,
        progressRatio,
        riskState,
        cannotStartReason: ex.cannotStartReason,
        productionOperations: serializeProductionOperations(
          ex.schedulePhase?.phase,
          ex.schedulePhase?.operations,
        ),
      }
    })

    const blockedItems = blockedExecutions.map((ex) => ({
      execId: ex.id,
      phaseId: ex.schedulePhaseId,
      phaseType: ex.schedulePhase?.phase ?? "IMALAT",
      musteriAdi: ex.schedulePhase?.workSchedule?.is?.musteriAdi ?? "—",
      urunAdi: ex.schedulePhase?.workSchedule?.is?.urunAdi ?? "",
      cannotStartReason: ex.cannotStartReason,
      materialLossCost: ex.materialLossCost != null ? String(ex.materialLossCost) : null,
      elapsedBlockedMinutes: Math.round((Date.now() - ex.updatedAt.getTime()) / 60_000),
      productionOperations: serializeProductionOperations(
        ex.schedulePhase?.phase,
        ex.schedulePhase?.operations,
      ),
    }))

    return NextResponse.json({
      aktifEkip,
      toplamAktif: aktifEkip.filter((e) => e.status === "STARTED").length,
      toplamPaused: aktifEkip.filter((e) => e.status === "PAUSED").length,
      blockedItems,
      toplamBlocked: blockedItems.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

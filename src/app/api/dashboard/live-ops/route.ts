import { NextResponse } from "next/server"
import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma"
import { computeElapsedMinutes } from "@/lib/execution/service"

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

    // Tek query — N+1 yok. Nested select ile personel + müşteri + ürün bilgisi.
    const executions = await prisma.phaseExecution.findMany({
      where: {
        atolyeId: auth.atolyeId,
        status: { in: ["STARTED", "PAUSED"] },
      },
      select: {
        id: true,
        schedulePhaseId: true,
        status: true,
        actualStartedAt: true,
        pauseMinutes: true,
        cannotStartReason: true,
        personel: {
          select: { ad: true, soyad: true },
        },
        schedulePhase: {
          select: {
            phase: true,
            workSchedule: {
              select: {
                is: {
                  select: {
                    musteriAdi: true,
                    urunAdi: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { actualStartedAt: "asc" },
    })

    const aktifEkip = executions.map((ex) => ({
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
      elapsedMinutes: computeElapsedMinutes(ex.actualStartedAt, ex.pauseMinutes),
      cannotStartReason: ex.cannotStartReason,
    }))

    return NextResponse.json({
      aktifEkip,
      toplamAktif: aktifEkip.filter((e) => e.status === "STARTED").length,
      toplamPaused: aktifEkip.filter((e) => e.status === "PAUSED").length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

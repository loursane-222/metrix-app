import { NextRequest, NextResponse } from "next/server"
import { getAtolyeAuth } from "@/lib/getAtolyeId"
import { prisma } from "@/lib/prisma"
import { createExecution, ExecutionError } from "@/lib/execution/service"

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth()
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 })
    }

    const body = await req.json()
    const schedulePhaseId = String(body.schedulePhaseId || "")
    if (!schedulePhaseId) {
      return NextResponse.json({ error: "schedulePhaseId gerekli" }, { status: 400 })
    }

    // Phase bu atolye'ye ait mi?
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

    // personelId: body'den veya auth'tan (personel girişi)
    const personelId: string | null =
      body.personelId ? String(body.personelId) : (auth.personelId ?? null)

    const execution = await createExecution({
      schedulePhaseId,
      atolyeId: auth.atolyeId,
      personelId,
      plannedStartAt: phase.plannedStart ?? null,
      plannedEndAt: phase.plannedEnd ?? null,
      estimatedMinutes: body.estimatedMinutes != null ? Number(body.estimatedMinutes) : null,
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

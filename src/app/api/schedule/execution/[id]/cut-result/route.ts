import { NextRequest, NextResponse } from "next/server";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { completeImalatWithCutResult } from "@/lib/execution/cut-result";
import { ExecutionError } from "@/lib/execution/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const { id: executionId } = await params;
    if (!executionId) {
      return NextResponse.json({ error: "Execution id gerekli" }, { status: 400 });
    }

    const body = await req.json();
    const result = await completeImalatWithCutResult({
      executionId,
      atolyeId: auth.atolyeId,
      personelId: body.personelId ? String(body.personelId) : (auth.personelId ?? null),
      userId: auth.userId,
      pieces: Array.isArray(body.pieces) ? body.pieces : [],
      offcuts: Array.isArray(body.offcuts) ? body.offcuts : [],
      stoneBroken: body.stoneBroken && typeof body.stoneBroken === "object" ? body.stoneBroken : null,
      note: body.note ? String(body.note) : null,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    if (error instanceof ExecutionError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("[schedule/execution/cut-result]", error);
    return NextResponse.json({ error: "Kesim sonucu kaydedilemedi" }, { status: 500 });
  }
}

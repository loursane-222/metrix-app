import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import {
  buildSaveJobV5DraftInput,
  mapJobV5SaveError,
  parseSaveJobV5DraftRequest,
  saveJobV5Draft,
} from "@/lib/yeni-is-v5/save";
import type { JobV5SaveDbClient } from "@/lib/yeni-is-v5/save";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAtolyeAuth();

    if (!auth) {
      return NextResponse.json({ success: false, error: "Yetkisiz" }, { status: 401 });
    }

    if (!auth.atolyeId) {
      return NextResponse.json({ success: false, error: "Atölye bulunamadı" }, { status: 403 });
    }

    const request = parseSaveJobV5DraftRequest(await req.json());
    const result = await saveJobV5Draft(
      prisma as unknown as JobV5SaveDbClient,
      buildSaveJobV5DraftInput(request, auth.atolyeId),
    );

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      mode: result.mode,
    });
  } catch (error) {
    const mapped = mapJobV5SaveError(error);

    if (mapped.status === 500) {
      console.error("[yeni-is-v5/save]", error);
    }

    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

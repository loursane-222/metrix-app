import { NextResponse } from "next/server";
import { getAtolyeAuth } from "@/lib/getAtolyeId";
import { buildScheduleRisks } from "@/lib/risk-intelligence/buildScheduleRisks";

export async function GET() {
  try {
    const auth = await getAtolyeAuth();
    if (!auth?.atolyeId) {
      return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    }

    const risks = await buildScheduleRisks({ atolyeId: auth.atolyeId });
    return NextResponse.json({ risks });
  } catch (error) {
    console.error("[schedule/risks]", error);
    return NextResponse.json({ error: "Riskler alınamadı" }, { status: 500 });
  }
}

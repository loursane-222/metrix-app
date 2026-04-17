import { NextRequest, NextResponse } from "next/server";
import { getSchedulesForMonth } from "@/app/actions/schedule";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));

  try {
    const schedules = await getSchedulesForMonth(year, month);
    return NextResponse.json(schedules);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Veri alınamadı" }, { status: 500 });
  }
}

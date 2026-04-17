import { NextRequest, NextResponse } from "next/server";
import { searchIsler } from "@/app/actions/schedule";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchIsler(q);
  return NextResponse.json(results);
}

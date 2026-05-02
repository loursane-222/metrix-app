import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ hata: "userId gerekli." }, { status: 400 });
    }

    return NextResponse.json({
      userId,
      permissions: [],
    });
  } catch (e: any) {
    console.error("menu-permissions GET error:", e);
    return NextResponse.json({ hata: e?.message || "Hata oluştu." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    return NextResponse.json({
      ok: true,
      saved: body,
    });
  } catch (e: any) {
    console.error("menu-permissions POST error:", e);
    return NextResponse.json({ hata: e?.message || "Hata oluştu." }, { status: 500 });
  }
}

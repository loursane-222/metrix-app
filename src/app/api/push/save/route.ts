import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, token } = await req.json();

  if (!userId || !token) {
    return NextResponse.json({ error: "Eksik veri" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token },
    update: {},
    create: { userId, token },
  });

  return NextResponse.json({ ok: true });
}

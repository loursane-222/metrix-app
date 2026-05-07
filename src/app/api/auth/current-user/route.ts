import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("metrix-token")?.value;

    if (!token) {
      return NextResponse.json({ userId: null }, { status: 401 });
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

    const { payload } = await jwtVerify(token, secret);
    const role = (payload as any).role || "admin";

    if (role === "personel") {
      return NextResponse.json({
        userId: (payload as any).id,
        email: (payload as any).email,
        role,
        personelId: (payload as any).personelId || null,
        atolyeId: (payload as any).atolyeId || null,
        aktif: true,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { atolye: true },
    });

    if (!user) {
      return NextResponse.json({ userId: null }, { status: 401 });
    }

    let atolye = user.atolye;

    if (!atolye) {
      atolye = await prisma.atolye.create({
        data: {
          userId: user.id,
          atolyeAdi: user.ad ? `${user.ad} Atölyesi` : "Yeni Atölye",
          email: user.email,
        },
      });
    }

    const simdi = new Date()
    const abonelikBitis = user.abonelikBitis
    const abonelikPlani = (user as any).abonelikPlani || 'demo'
    const demoBitti = abonelikBitis ? abonelikBitis < simdi : true

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      role: "admin",
      aktif: user.aktif,
      abonelikBitis: user.abonelikBitis,
      abonelikPlani,
      demoBitti,
      atolyeId: atolye.id,
    });
  } catch (e) {
    console.error("current-user error:", e);
    return NextResponse.json({ userId: null }, { status: 401 });
  }
}

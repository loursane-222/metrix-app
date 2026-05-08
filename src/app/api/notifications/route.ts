import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

async function getAtolyeId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );
    const { payload } = await jwtVerify(token, secret);
    if ((payload as any).role === "personel") {
      return (payload as any).atolyeId || null;
    }
    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });
    return user?.atolye?.id || null;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const atolyeId = await getAtolyeId();
    if (!atolyeId) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Notifications GET error:", error);
    return NextResponse.json(
      { error: "Bildirimler alınamadı" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const atolyeId = await getAtolyeId();
    if (!atolyeId) {
      return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
    }
    const { id } = await req.json();
    if (!id) {
      await prisma.notification.updateMany({ data: { isRead: true } });
    } else {
      await prisma.notification.update({ where: { id }, data: { isRead: true } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Notifications PATCH error:", error);
    return NextResponse.json({ error: "Güncelleme başarısız" }, { status: 500 });
  }
}

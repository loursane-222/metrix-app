import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
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

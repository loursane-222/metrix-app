import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

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

    const role = payload.role === "personel" ? "personel" : "admin";
    const personelId = (payload.personelId as string | undefined) ?? null;

    let allowedMenus: string[] | null = null;
    let permissions: any = null;

    if (role === "personel" && personelId) {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "personel_yetkileri" WHERE "personelId" = $1 LIMIT 1`,
        personelId
      );

      const y = rows[0];

      permissions = y || null;
      allowedMenus = [];

      if (y?.isProgramiGorebilir) allowedMenus.push("/dashboard/is-programi");
      if (y?.musteriGorebilir) allowedMenus.push("/dashboard/musteriler");
      if (y?.maliyetGorebilir) {
        allowedMenus.push("/dashboard/atolye");
        allowedMenus.push("/dashboard/yeni-is");
        allowedMenus.push("/dashboard/isler");
      }
      if (y?.teklifOlusturabilir) {
        allowedMenus.push("/dashboard/yeni-is");
        allowedMenus.push("/dashboard/isler");
        allowedMenus.push("/dashboard/plaka-planlayici");
      }
      if (y?.atolyeAyarGorebilir) allowedMenus.push("/dashboard/atolye");

      allowedMenus = Array.from(new Set(allowedMenus));

      if (allowedMenus.length === 0) {
        allowedMenus.push("/dashboard");
      }
    }

    return NextResponse.json({
      userId: payload.id ?? null,
      email: payload.email ?? null,
      role,
      personelId,
      atolyeId: payload.atolyeId ?? null,
      allowedMenus,
      permissions,
    });
  } catch (e) {
    console.error("current-user error:", e);
    return NextResponse.json({ userId: null }, { status: 401 });
  }
}

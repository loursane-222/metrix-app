import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json([]);
  }

  const permissions = await prisma.menuPermission.findMany({
    where: { userId },
  });

  return NextResponse.json(permissions);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, permissions } = body;

    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Eksik bilgi gönderildi." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      permissions.map((p: any) =>
        prisma.menuPermission.upsert({
          where: {
            userId_menuKey: {
              userId,
              menuKey: p.menuKey,
            },
          },
          update: {
            canView: !!p.canView,
            canCreate: !!p.canCreate,
            canEdit: !!p.canEdit,
            canDelete: !!p.canDelete,
          },
          create: {
            userId,
            menuKey: p.menuKey,
            canView: !!p.canView,
            canCreate: !!p.canCreate,
            canEdit: !!p.canEdit,
            canDelete: !!p.canDelete,
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Hata" }, { status: 500 });
  }
}

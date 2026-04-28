const fs = require("fs");

const file = "src/app/api/tas-gorev-personel/route.ts";
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
fs.copyFileSync(file, `${file}.bak-personel-raw-fix-${stamp}`);

const content = `import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

async function authAtolyeId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "metrix-gizli-anahtar-2024");
    const { payload } = await jwtVerify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: (payload as any).id },
      include: { atolye: true },
    });

    return user?.atolye?.id || null;
  } catch {
    return null;
  }
}

async function ensureTable() {
  await prisma.$executeRawUnsafe(\`
    CREATE TABLE IF NOT EXISTS "TasGorevPersonel" (
      "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "isId" TEXT NOT NULL UNIQUE,
      "personelId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  \`);
}

export async function GET(req: NextRequest) {
  try {
    const atolyeId = await authAtolyeId();
    if (!atolyeId) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

    await ensureTable();

    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("isIds") || "";
    const isIds = raw.split(",").map(x => x.trim()).filter(Boolean);

    if (!isIds.length) return NextResponse.json({ atamalar: {} });

    const rows: any[] = await prisma.$queryRawUnsafe(\`
      SELECT "isId", "personelId"
      FROM "TasGorevPersonel"
      WHERE "isId" = ANY($1::text[])
    \`, isIds);

    const personelIds = Array.from(new Set(rows.map(r => r.personelId).filter(Boolean)));

    const personeller = personelIds.length
      ? await prisma.personel.findMany({
          where: { id: { in: personelIds }, atolyeId },
          select: { id: true, ad: true, soyad: true, gorevi: true },
        })
      : [];

    const personelMap = new Map(personeller.map(p => [p.id, p]));

    const atamalar: Record<string, any> = {};
    for (const r of rows) {
      const p = r.personelId ? personelMap.get(r.personelId) : null;
      atamalar[r.isId] = {
        isId: r.isId,
        personelId: r.personelId || "",
        ad: p?.ad || "",
        soyad: p?.soyad || "",
        gorevi: p?.gorevi || "",
      };
    }

    return NextResponse.json({ atamalar });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const atolyeId = await authAtolyeId();
    if (!atolyeId) return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });

    await ensureTable();

    const body = await req.json();
    const isId = String(body?.isId || "");
    const personelId = body?.personelId ? String(body.personelId) : null;

    if (!isId) return NextResponse.json({ hata: "İş ID gerekli." }, { status: 400 });

    const is = await prisma.is.findFirst({
      where: { id: isId, atolyeId },
      select: { id: true },
    });

    if (!is) return NextResponse.json({ hata: "İş bulunamadı." }, { status: 404 });

    let personel: any = null;

    if (personelId) {
      personel = await prisma.personel.findFirst({
        where: { id: personelId, atolyeId, aktif: true },
        select: { id: true, ad: true, soyad: true, gorevi: true },
      });

      if (!personel) return NextResponse.json({ hata: "Personel bulunamadı." }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(\`
      INSERT INTO "TasGorevPersonel" ("isId", "personelId", "updatedAt")
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT ("isId")
      DO UPDATE SET "personelId" = EXCLUDED."personelId", "updatedAt" = CURRENT_TIMESTAMP
    \`, isId, personelId);

    return NextResponse.json({
      ok: true,
      atama: {
        isId,
        personelId: personelId || "",
        ad: personel?.ad || "",
        soyad: personel?.soyad || "",
        gorevi: personel?.gorevi || "",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
`;

fs.writeFileSync(file, content);

console.log("✅ tas-gorev-personel API raw Personel hatası düzeltildi.");

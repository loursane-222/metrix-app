const fs = require("fs");
const path = require("path");

function backup(file) {
  const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.bak-tas-kaydet-${stamp}`);
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/* 1) API: taş görev personel ataması */
write("src/app/api/tas-gorev-personel/route.ts", `import { NextRequest, NextResponse } from "next/server";
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
      SELECT 
        t."isId",
        t."personelId",
        p."ad",
        p."soyad",
        p."gorevi"
      FROM "TasGorevPersonel" t
      INNER JOIN "Is" i ON i."id" = t."isId"
      LEFT JOIN "Personel" p ON p."id" = t."personelId"
      WHERE i."atolyeId" = $1
      AND t."isId" = ANY($2::text[])
    \`, atolyeId, isIds);

    const atamalar: Record<string, any> = {};
    for (const r of rows) {
      atamalar[r.isId] = {
        isId: r.isId,
        personelId: r.personelId,
        ad: r.ad || "",
        soyad: r.soyad || "",
        gorevi: r.gorevi || "",
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

    if (personelId) {
      const personel = await prisma.personel.findFirst({
        where: { id: personelId, atolyeId, aktif: true },
        select: { id: true },
      });

      if (!personel) return NextResponse.json({ hata: "Personel bulunamadı." }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(\`
      INSERT INTO "TasGorevPersonel" ("isId", "personelId", "updatedAt")
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT ("isId")
      DO UPDATE SET "personelId" = EXCLUDED."personelId", "updatedAt" = CURRENT_TIMESTAMP
    \`, isId, personelId);

    const rows: any[] = await prisma.$queryRawUnsafe(\`
      SELECT 
        t."isId",
        t."personelId",
        p."ad",
        p."soyad",
        p."gorevi"
      FROM "TasGorevPersonel" t
      LEFT JOIN "Personel" p ON p."id" = t."personelId"
      WHERE t."isId" = $1
      LIMIT 1
    \`, isId);

    return NextResponse.json({ ok: true, atama: rows[0] || { isId, personelId } });
  } catch (e: any) {
    return NextResponse.json({ hata: e.message }, { status: 500 });
  }
}
`);

/* 2) PremiumWorkCalendar patch */
const file = "src/components/schedule/PremiumWorkCalendar.tsx";
backup(file);
let s = fs.readFileSync(file, "utf8");

s = s.replace(
  `import { useMemo, useState } from "react";`,
  `import { useMemo, useState, useEffect } from "react";`
);

/* helper fonksiyonları ekle */
if (!s.includes("async function saveTasAtama")) {
  s = s.replace(
`  async function refresh(y = year, m = month) {
    const res = await fetch(\`/api/schedule?year=\${y}&month=\${m}\`, { cache: "no-store" });
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
  }`,
`  async function refresh(y = year, m = month) {
    const res = await fetch(\`/api/schedule?year=\${y}&month=\${m}\`, { cache: "no-store" });
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
  }

  async function loadTasAtamalar(list = schedules) {
    const ids = Array.from(new Set((list || []).map((x: any) => x?.is?.id).filter(Boolean)));
    if (!ids.length) {
      setTasAtamalar({});
      return;
    }

    try {
      const res = await fetch(\`/api/tas-gorev-personel?isIds=\${encodeURIComponent(ids.join(","))}\`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();
      setTasAtamalar(data?.atamalar || {});
    } catch {
      setTasAtamalar({});
    }
  }

  async function saveTasAtama(kapat = false) {
    if (!tasModal?.schedule?.is?.id) return;

    const res = await fetch("/api/tas-gorev-personel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        isId: tasModal.schedule.is.id,
        personelId: tasAlacakPersonelId || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.hata || "Personel ataması kaydedilemedi.");
      return;
    }

    const atama = data?.atama || {};
    setTasAtamalar((prev: any) => ({
      ...prev,
      [tasModal.schedule.is.id]: {
        isId: tasModal.schedule.is.id,
        personelId: atama.personelId || tasAlacakPersonelId || "",
        ad: atama.ad || "",
        soyad: atama.soyad || "",
        gorevi: atama.gorevi || "",
      },
    }));

    await refresh();
    if (kapat) setTasModal(null);
  }`
  );
}

/* schedules değişince taş atamalarını yükle */
if (!s.includes("loadTasAtamalar(schedules);")) {
  s = s.replace(
`  const visibleHeaders = range === "TODAY"
    ? [DAYS[((today.getDay() || 7) - 1)]]
    : DAYS;`,
`  useEffect(() => {
    loadTasAtamalar(schedules);
  }, [schedules]);

  const visibleHeaders = range === "TODAY"
    ? [DAYS[((today.getDay() || 7) - 1)]]
    : DAYS;`
  );
}

/* bugünün panelinde taş görevine tıklayınca modal aç */
s = s.replace(
`                if (x.phase === "IMALAT" && !x.completed) {`,
`                if (x.kind === "tas") {
                  setTasModal(x);
                  setTasAlacakPersonelId(x.tasAtama?.personelId || "");
                } else if (x.phase === "IMALAT" && !x.completed) {`
);

/* modal içine Kaydet butonu ekle */
if (!s.includes("Personeli Kaydet")) {
  s = s.replace(
`            <div className="mt-5 grid gap-3">
              <button`,
`            <div className="mt-5 grid gap-3">
              <button
                onClick={async () => {
                  await saveTasAtama(false);
                }}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-left hover:bg-blue-100"
              >
                <p className="font-bold text-blue-700">Personeli Kaydet</p>
                <p className="text-xs text-slate-500">Taş durumunu değiştirmeden sadece atamayı kaydeder.</p>
              </button>

              <button`
  );
}

/* Bekliyor / Alındı butonlarında tekrar eden fetch'i helper'a çevir */
s = s.replace(
/await fetch\("\/api\/tas-gorev-personel",\s*{\s*method:\s*"POST",\s*headers:\s*{\s*"Content-Type":\s*"application\/json"\s*},\s*credentials:\s*"include",\s*body:\s*JSON\.stringify\(\{\s*isId:\s*tasModal\.schedule\?\.is\?\.id,\s*personelId:\s*tasAlacakPersonelId\s*\|\|\s*null,\s*}\),\s*}\);\s*/g,
`await saveTasAtama(false);
                  `
);

fs.writeFileSync(file, s);

console.log("✅ Taş görevi personel kaydetme akışı eklendi.");

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

if (process.env.NODE_ENV !== "production") type PhaseKey = "OLCU" | "IMALAT" | "MONTAJ";

async function ownerAtolyeIdAl() {
  const cookieStore = await cookies();
  const token = cookieStore.get("metrix-token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "metrix-gizli-anahtar-2024"
    );

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

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function trDate(ymd: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(dateFromYmd(ymd));
}

function dateFromYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 9, 0, 0);
}

function isBusinessDay(d: Date) {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function addDays(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

function nextBusinessDayFrom(start: Date) {
  let d = new Date(start);
  d.setHours(9, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    if (isBusinessDay(d)) return d;
    d = addDays(d, 1);
  }

  return d;
}

function loadKey() {
  return { total: 0, OLCU: 0, IMALAT: 0, MONTAJ: 0 };
}

function phaseWeight(phase: string) {
  if (phase === "IMALAT") return 3;
  if (phase === "MONTAJ") return 2;
  if (phase === "OLCU") return 1;
  return 1;
}

function reserveLoad(
  loads: Record<string, { total: number; OLCU: number; IMALAT: number; MONTAJ: number }>,
  d: Date,
  phase: PhaseKey
) {
  const key = localYmd(d);
  if (!loads[key]) loads[key] = loadKey();
  loads[key].total += phaseWeight(phase);
  loads[key][phase] += 1;
}

function pickBestDay(
  loads: Record<string, { total: number; OLCU: number; IMALAT: number; MONTAJ: number }>,
  from: Date,
  phase: PhaseKey,
  minGapDays: number
) {
  let best: { date: Date; score: number } | null = null;

  for (let i = minGapDays; i < minGapDays + 30; i++) {
    const d = addDays(from, i);
    d.setHours(9, 0, 0, 0);

    if (!isBusinessDay(d)) continue;

    const key = localYmd(d);
    const load = loads[key] || loadKey();

    // Aynı görev türü aynı güne 5'ten fazla yazılamaz.
    if (load[phase] >= 5) continue;

    let score = load.total * 10 + load[phase] * 25;

    if (phase === "IMALAT") score += load.IMALAT * 20;
    if (phase === "MONTAJ") score += load.MONTAJ * 18;
    if (phase === "OLCU") score += load.OLCU * 14;

    // Pazartesi montajı çok doldurma, cuma ölçüyü çok doldurma.
    if (d.getDay() === 1 && phase === "MONTAJ") score += 8;
    if (d.getDay() === 5 && phase === "OLCU") score += 6;

    if (!best || score < best.score) best = { date: d, score };
  }

  if (best) return best.date;

  // 30 gün içinde yer yoksa yine de sadece hafta içi bul.
  return nextBusinessDayFrom(from);
}

export async function POST(req: NextRequest) {
  try {
    const atolyeId = await ownerAtolyeIdAl();
    if (!atolyeId) {
      return NextResponse.json({ error: "Sadece ana hesap plan önerisi alabilir" }, { status: 403 });
    }

    const body = await req.json();
    const isId = String(body.isId || "");
    if (!isId) return NextResponse.json({ error: "İş seçilmedi" }, { status: 400 });

    const job = await prisma.is.findFirst({
      where: { id: isId, atolyeId },
      select: {
        id: true,
        musteriAdi: true,
        urunAdi: true,
        toplamSureDakika: true,
        workSchedule: true,
      },
    });

    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
    if (job.workSchedule) return NextResponse.json({ error: "Bu iş zaten programa alınmış" }, { status: 409 });

    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const windowStart = addDays(today, -3);
    const windowEnd = addDays(today, 35);

    const schedules = await prisma.workSchedule.findMany({
      where: {
        is: { atolyeId },
        phases: {
          some: {
            plannedStart: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
        },
      },
      include: {
        phases: true,
      },
    });

    const loads: Record<string, { total: number; OLCU: number; IMALAT: number; MONTAJ: number }> = {};

    for (const schedule of schedules) {
      for (const p of schedule.phases) {
        if (!p.plannedStart) continue;

        const d = new Date(p.plannedStart);
        d.setHours(9, 0, 0, 0);

        // Hafta sonuna yanlışlıkla düşmüş eski kayıtları öneri hesabında kapasiteye katma.
        if (!isBusinessDay(d)) continue;

        const key = localYmd(d);
        if (!loads[key]) loads[key] = loadKey();

        loads[key].total += phaseWeight(p.phase);
        if (p.phase === "OLCU") loads[key].OLCU += 1;
        if (p.phase === "IMALAT") loads[key].IMALAT += 1;
        if (p.phase === "MONTAJ") loads[key].MONTAJ += 1;
      }
    }

    const base = nextBusinessDayFrom(today);

    const olcu = pickBestDay(loads, base, "OLCU", 0);
    reserveLoad(loads, olcu, "OLCU");

    const imalat = pickBestDay(loads, olcu, "IMALAT", 1);
    reserveLoad(loads, imalat, "IMALAT");

    const montaj = pickBestDay(loads, imalat, "MONTAJ", 1);
    reserveLoad(loads, montaj, "MONTAJ");

    const olcuYmd = localYmd(olcu);
    const imalatYmd = localYmd(imalat);
    const montajYmd = localYmd(montaj);

    const plan = {
      OLCU: dateFromYmd(olcuYmd).toISOString(),
      IMALAT: dateFromYmd(imalatYmd).toISOString(),
      MONTAJ: dateFromYmd(montajYmd).toISOString(),
    };

    const reasons = [
      `${trDate(olcuYmd)} ölçü için hafta içi ve kapasitesi uygun gün olarak seçildi.`,
      `${trDate(imalatYmd)} imalat için ölçüden sonraki en dengeli iş günü olarak seçildi.`,
      `${trDate(montajYmd)} montaj için imalattan sonraki en uygun hafta içi gün olarak seçildi.`,
      `Kural: Ölçü, imalat ve montaj hafta sonuna yazılmaz; aynı görev türü bir günde 5 adedi geçemez.`,
    ];

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        musteriAdi: job.musteriAdi,
        urunAdi: job.urunAdi,
      },
      plan,
      reasons,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Plan önerisi üretilemedi" }, { status: 500 });
  }
}

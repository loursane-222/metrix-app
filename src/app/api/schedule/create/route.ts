import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

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

function isBusinessDay(d: Date) {
  const day = d.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(start: Date, days: number) {
  const d = new Date(start);
  let added = 0;

  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (isBusinessDay(d)) added++;
  }

  return d;
}

function atStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0);
}

function isBusinessDayStrict(d: Date) {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function pushToBusinessDay(d: Date) {
  const n = new Date(d);
  while (!isBusinessDayStrict(n)) {
    n.setDate(n.getDate() + 1);
  }
  return n;
}

function safeDate(value: any, fallback: Date) {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  return pushToBusinessDay(d);
}

export async function POST(req: NextRequest) {
  try {
    const atolyeId = await ownerAtolyeIdAl();
    if (!atolyeId) {
      return NextResponse.json({ error: "Sadece ana hesap yeni iş oluşturabilir" }, { status: 403 });
    }

    const body = await req.json();
    const isId = String(body.isId || "");

    if (!isId) {
      return NextResponse.json({ error: "İş seçilmedi" }, { status: 400 });
    }

    const job = await prisma.is.findFirst({
      where: { id: isId, atolyeId },
      include: { workSchedule: true },
    });

    if (!job) return NextResponse.json({ error: "İş bulunamadı" }, { status: 404 });
    if (job.workSchedule) return NextResponse.json({ error: "Bu iş zaten programa alınmış" }, { status: 409 });

    const today = new Date();
    const base = isBusinessDay(today) ? today : addBusinessDays(today, 1);

    const defaultOlcu = atStartOfDay(base);
    const defaultImalat = atStartOfDay(addBusinessDays(defaultOlcu, 1));
    const defaultMontaj = atStartOfDay(addBusinessDays(defaultImalat, 1));

    const plan = body.plan || {};

    const olcu = safeDate(plan.OLCU, defaultOlcu);
    const imalat = safeDate(plan.IMALAT, defaultImalat);
    const montaj = safeDate(plan.MONTAJ, defaultMontaj);

    const schedule = await prisma.workSchedule.create({
      data: {
        isId,
        startDate: olcu,
        endDate: montaj,
        phases: {
          create: [
            { phase: "OLCU", plannedStart: olcu, plannedEnd: olcu },
            { phase: "IMALAT", plannedStart: imalat, plannedEnd: imalat },
            { phase: "MONTAJ", plannedStart: montaj, plannedEnd: montaj },
          ],
        },
      },
      include: {
        is: true,
        phases: {
          include: {
            fazAtamalar: {
              include: { personel: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "İş programa eklenemedi" }, { status: 500 });
  }
}

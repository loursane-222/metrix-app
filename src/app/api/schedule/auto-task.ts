import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function geri3IsGunu(date: Date) {
  let d = new Date(date);
  let count = 0;

  while (count < 3) {
    d.setDate(d.getDate() - 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      count++;
    }
  }
  return d;
}

export async function tasAlmaGoreviOlustur(isId: string) {
  const is = await prisma.is.findUnique({
    where: { id: isId },
    include: { schedules: true },
  });

  if (!is) return;

  if (is.tasDurumu !== "alinacak") return;

  const olcuPhase = await prisma.schedulePhase.findFirst({
    where: {
      workSchedule: { isId },
      phase: "OLCU",
    },
  });

  if (!olcuPhase) return;

  const tarih = geri3IsGunu(new Date(olcuPhase.plannedStart));

  const schedule = await prisma.workSchedule.findFirst({
    where: { isId },
  });

  if (!schedule) return;

  await prisma.schedulePhase.create({
    data: {
      workScheduleId: schedule.id,
      phase: "TAS_ALINACAK",
      plannedStart: tarih,
      plannedEnd: tarih,
    },
  });
}

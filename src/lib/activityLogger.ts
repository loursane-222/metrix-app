import { prisma } from "@/lib/prisma";

export async function logActivity({
  atolyeId,
  type,
  message,
  refId,
  userId,
  personelId,
}: {
  atolyeId: string;
  type: string;
  message: string;
  refId?: string;
  userId?: string;
  personelId?: string;
}) {
  try {
    await prisma.activityLog.create({
      data: {
        atolyeId,
        type,
        message,
        refId: refId || null,
        userId: userId || null,
        personelId: personelId || null,
      },
    });
  } catch {
    // log hatalari sessizce gecsin
  }
}

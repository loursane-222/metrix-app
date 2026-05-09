import { prisma } from "./prisma";
import { sseEmitter } from "./sseEmitter";

interface LogParams {
  atolyeId: string;
  userId?: string;
  personelId?: string;
  type: string;
  message: string;
  refId?: string;
}

export async function logActivity(params: LogParams) {
  try {
    await prisma.activityLog.create({
      data: {
        atolyeId: params.atolyeId,
        userId: params.userId,
        personelId: params.personelId,
        type: params.type,
        message: params.message,
        refId: params.refId,
      },
    });

    await prisma.notification.create({
      data: {
        atolyeId: params.atolyeId,
        type: params.type,
        title: "Metrix",
        description: params.message,
        actionUrl: "/dashboard",
        isRead: false,
      },
    });

    // SSE ile anlık bildirim — tüm bağlı kullanıcılara
    sseEmitter.emit(`activity:${params.atolyeId}`, {
      type: "activity",
      message: params.message,
      activityType: params.type,
    });

  } catch (e) {
    console.error("logActivity error:", e);
  }
}

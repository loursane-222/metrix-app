import { prisma } from "./prisma";
import { sseEmitter } from "./sseEmitter";
import { pushToAtolye } from "./push/pushToAtolye";

interface LogParams {
  atolyeId: string;
  userId?: string;
  personelId?: string;
  type: string;
  message: string;
  refId?: string;
  url?: string;
  awaitPush?: boolean;
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

  const pushPayload = {
    title: "Metrix",
    body: params.message,
    url: params.url ?? "/dashboard",
  };

  // Web Push errors must not bubble to callers. Critical paths can opt in to await.
  if (params.awaitPush) {
    try {
      await pushToAtolye(params.atolyeId, pushPayload);
    } catch (e) {
      console.error("[push] unhandled:", e);
    }
    return;
  }

  void pushToAtolye(params.atolyeId, pushPayload).catch((e) => console.error("[push] unhandled:", e));
}

import { prisma } from "./prisma";
import { sseEmitter } from "./sseEmitter";
import { pushToAtolye } from "./push/pushToAtolye";
import { Prisma } from "@prisma/client";

interface LogParams {
  atolyeId: string;
  userId?: string;
  personelId?: string;
  type: string;
  message: string;
  refId?: string;
  eventType?: string;
  category?: string;
  severity?: string;
  source?: string;
  title?: string;
  url?: string;
  refType?: string;
  actorId?: string;
  actorName?: string;
  attachmentUrl?: string;
  metadata?: Record<string, unknown>;
  awaitPush?: boolean;
  skipPush?: boolean;
}

const STRUCTURED_ACTIVITY_COLUMNS = [
  "eventType",
  "category",
  "severity",
  "source",
  "title",
  "url",
  "refType",
  "actorId",
  "actorName",
  "attachmentUrl",
  "metadata",
];

function isStructuredActivityColumnError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
    const column = String(error.meta?.column ?? "");
    return STRUCTURED_ACTIVITY_COLUMNS.some((field) => column.includes(field));
  }

  const message = error instanceof Error ? error.message : String(error);
  return STRUCTURED_ACTIVITY_COLUMNS.some((field) => message.includes(field));
}

async function createNotification(params: LogParams) {
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
        eventType: params.eventType,
        category: params.category,
        severity: params.severity,
        source: params.source,
        title: params.title,
        url: params.url,
        refType: params.refType,
        actorId: params.actorId,
        actorName: params.actorName,
        attachmentUrl: params.attachmentUrl,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    await createNotification(params);

    // SSE ile anlık bildirim — tüm bağlı kullanıcılara
    sseEmitter.emit(`activity:${params.atolyeId}`, {
      type: "activity",
      message: params.message,
      activityType: params.type,
    });

  } catch (e) {
    if (isStructuredActivityColumnError(e)) {
      console.warn("logActivity structured fields unavailable, falling back to legacy ActivityLog create:", e);
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
        await createNotification(params);
        sseEmitter.emit(`activity:${params.atolyeId}`, {
          type: "activity",
          message: params.message,
          activityType: params.type,
        });
      } catch (fallbackError) {
        console.error("logActivity fallback error:", fallbackError);
      }
    } else {
      console.error("logActivity error:", e);
    }
  }

  const pushPayload = {
    title: "Metrix",
    body: params.message,
    url: params.url ?? "/dashboard",
  };

  if (params.skipPush) return;

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

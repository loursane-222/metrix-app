import { logActivity } from "@/lib/activityLogger";
import type { EmitMetrixEventInput } from "./types";

function activityType(type: EmitMetrixEventInput["type"]) {
  return type.toLowerCase();
}

function attachmentUrlFromPayload(payload: Record<string, unknown> | undefined) {
  const url = payload?.photoUrl;
  return typeof url === "string" && url.trim() !== "" ? url : undefined;
}

export async function emitMetrixEvent(input: EmitMetrixEventInput) {
  const shouldWriteActivity = input.feed !== false || input.notify === true;
  if (!shouldWriteActivity) return null;

  const metadata = {
    ...(input.payload ?? {}),
    source: input.source,
    severity: input.severity ?? "info",
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    title: input.title,
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    risk: input.risk ?? false,
    aiMemory: input.aiMemory ?? false,
    feed: input.feed ?? true,
    notify: input.notify ?? false,
  };
  const attachmentUrl = attachmentUrlFromPayload(input.payload);

  try {
    await logActivity({
      atolyeId: input.atolyeId,
      userId: input.actorUserId ?? undefined,
      personelId: input.actorPersonelId ?? undefined,
      type: activityType(input.type),
      message: input.message,
      refId: input.entityId ?? undefined,
      eventType: input.type,
      category: input.source,
      severity: input.severity ?? "info",
      source: input.source,
      title: input.title,
      url: input.url,
      refType: input.entityType,
      actorId: input.actorId ?? undefined,
      actorName: input.actorName ?? undefined,
      attachmentUrl,
      metadata,
      awaitPush: input.notify === true,
      skipPush: input.notify !== true,
    });

    return { ok: true, payload: metadata };
  } catch (error) {
    console.warn("emitMetrixEvent failed:", error);
    return { ok: false, error, payload: metadata };
  }
}

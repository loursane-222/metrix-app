import { logActivity } from "@/lib/activityLogger";
import {
  getNotificationEventConfig,
  NotificationEventType,
  shouldAwaitPushForEvent,
} from "@/lib/notificationCatalog";

type ActorInput = {
  userId?: string | null;
  personelId?: string | null;
};

const PIPELINE_VERSION = "N5G";
const COSTING_URL = "/dashboard/atolye";

function formatMoney(amount: number, currency = "TL") {
  return `${Math.round(amount).toLocaleString("tr-TR")} ${currency}`;
}

async function notify(input: ActorInput & {
  atolyeId: string;
  eventType: string;
  source: string;
  message: string;
  refId: string;
  refType: string;
  metadata: Record<string, unknown>;
}) {
  const eventConfig = getNotificationEventConfig(input.eventType);
  const pushAwaited = shouldAwaitPushForEvent(input.eventType);

  await logActivity({
    atolyeId: input.atolyeId,
    userId: input.userId ?? undefined,
    personelId: input.personelId ?? undefined,
    type: input.eventType,
    eventType: input.eventType,
    category: eventConfig.category,
    severity: eventConfig.severity,
    source: input.source,
    title: eventConfig.defaultTitle,
    message: input.message,
    refId: input.refId,
    refType: input.refType,
    url: COSTING_URL,
    metadata: {
      eventType: input.eventType,
      category: eventConfig.category,
      source: input.source,
      notificationPipelineVersion: PIPELINE_VERSION,
      pushAwaited,
      ...input.metadata,
    },
    awaitPush: pushAwaited,
  });
}

export async function notifyMachineCostChanged(input: ActorInput & {
  atolyeId: string;
  machineId: string;
  machineName: string;
  action: "created" | "updated" | "deleted";
  amount?: number | null;
  currency?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const actionLabel = input.action === "created"
    ? "eklendi"
    : input.action === "deleted"
      ? "silindi"
      : "güncellendi";

  await notify({
    ...input,
    eventType: NotificationEventType.COSTING.WORKSHOP_COST_CHANGED,
    source: "workshop-cost",
    message: `Makine maliyeti ${actionLabel}: ${input.machineName}${input.amount != null ? `, ${formatMoney(input.amount, input.currency || "TL")}` : ""}.`,
    refId: input.machineId,
    refType: "Makine",
    metadata: {
      machineId: input.machineId,
      machineName: input.machineName,
      action: input.action,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    },
  });
}

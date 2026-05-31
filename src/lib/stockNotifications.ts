import { logActivity } from "@/lib/activityLogger";
import {
  getNotificationEventConfig,
  NotificationEventType,
  shouldAwaitPushForEvent,
} from "@/lib/notificationCatalog";

type ActorInput = {
  userId?: string | null;
  personelId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
};

type StockNotificationInput = ActorInput & {
  atolyeId: string;
  message?: string;
  refId?: string | null;
  refType?: string;
  url?: string;
  metadata?: Record<string, unknown>;
};

const STOCK_URL = "/dashboard/stok";
const PIPELINE_VERSION = "N5D";

function stockUrl(input?: { phaseId?: string | null; jobId?: string | null }) {
  if (input?.phaseId) return `/dashboard/is-programi?phaseId=${input.phaseId}`;
  if (input?.jobId) return `/dashboard/isler?isId=${input.jobId}`;
  return STOCK_URL;
}

async function notifyStock(input: StockNotificationInput & {
  eventType: string;
  source: string;
  message: string;
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
    refId: input.refId ?? undefined,
    refType: input.refType,
    url: input.url ?? STOCK_URL,
    actorId: input.actorId ?? undefined,
    actorName: input.actorName ?? undefined,
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

export async function notifyStockProductCreated(input: StockNotificationInput & {
  productName?: string | null;
  plateCount?: number | null;
  stockPlateIds?: string[];
  stockMovementIds?: string[];
  amount?: number | null;
  currency?: string | null;
}) {
  const count = input.plateCount ?? input.stockPlateIds?.length ?? 1;
  await notifyStock({
    ...input,
    eventType: NotificationEventType.STOCK.STOCK_PRODUCT_CREATED,
    source: "stock",
    refType: input.refType ?? "StockPlate",
    url: input.url ?? STOCK_URL,
    message: input.message || `Stok ürünü oluşturuldu: ${input.productName || "Ürün"}, ${count} plaka.`,
    metadata: {
      stockProductId: input.productName ?? null,
      stockPlateIds: input.stockPlateIds ?? [],
      stockMovementIds: input.stockMovementIds ?? [],
      quantity: count,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      ...input.metadata,
    },
  });
}

export async function notifyStockEntryCreated(input: StockNotificationInput & {
  productName?: string | null;
  purchaseId?: string | null;
  purchaseCode?: string | null;
  stockPlateIds?: string[];
  stockMovementIds?: string[];
  quantity?: number | null;
  amount?: number | null;
  currency?: string | null;
  action?: string;
  jobId?: string | null;
}) {
  const quantity = input.quantity ?? input.stockPlateIds?.length ?? 1;
  await notifyStock({
    ...input,
    eventType: NotificationEventType.STOCK.STOCK_ENTRY_CREATED,
    source: "stock",
    refId: input.refId ?? input.purchaseId ?? input.stockPlateIds?.[0] ?? undefined,
    refType: input.refType ?? (input.purchaseId ? "StockPurchase" : "StockPlate"),
    url: input.url ?? stockUrl({ jobId: input.jobId }),
    message: input.message || `Stok girişi yapıldı: ${input.productName || "Ürün"}, ${quantity} plaka.`,
    metadata: {
      action: input.action ?? "entry_created",
      purchaseId: input.purchaseId ?? null,
      purchaseCode: input.purchaseCode ?? null,
      stockPlateIds: input.stockPlateIds ?? [],
      stockMovementIds: input.stockMovementIds ?? [],
      jobId: input.jobId ?? null,
      quantity,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      ...input.metadata,
    },
  });
}

export async function notifyStockReserved(input: StockNotificationInput & {
  reservationIds?: string[];
  stockPlateIds?: string[];
  stockMovementIds?: string[];
  jobId?: string | null;
  jobName?: string | null;
  customerName?: string | null;
  workScheduleId?: string | null;
  phaseId?: string | null;
  schedulePhaseId?: string | null;
  quantity?: number | null;
}) {
  const quantity = input.quantity ?? input.reservationIds?.length ?? input.stockPlateIds?.length ?? 1;
  const label = input.customerName || input.jobName || "İş";
  await notifyStock({
    ...input,
    eventType: NotificationEventType.STOCK.STOCK_RESERVED,
    source: "stock-reservation",
    refId: input.refId ?? input.jobId ?? input.reservationIds?.[0] ?? undefined,
    refType: input.refType ?? "StockReservation",
    url: input.url ?? stockUrl({ phaseId: input.phaseId ?? input.schedulePhaseId, jobId: input.jobId }),
    message: input.message || `${label} için ${quantity} plaka rezerve edildi.`,
    metadata: {
      reservationIds: input.reservationIds ?? [],
      stockPlateIds: input.stockPlateIds ?? [],
      stockMovementIds: input.stockMovementIds ?? [],
      jobId: input.jobId ?? null,
      workScheduleId: input.workScheduleId ?? null,
      phaseId: input.phaseId ?? input.schedulePhaseId ?? null,
      schedulePhaseId: input.schedulePhaseId ?? input.phaseId ?? null,
      quantity,
      ...input.metadata,
    },
  });
}

export async function notifyStockConsumed(input: StockNotificationInput & {
  reservationIds?: string[];
  stockPlateIds?: string[];
  stockMovementIds?: string[];
  jobId?: string | null;
  jobName?: string | null;
  customerName?: string | null;
  workScheduleId?: string | null;
  phaseId?: string | null;
  schedulePhaseId?: string | null;
  phaseOperationId?: string | null;
  quantity?: number | null;
  amount?: number | null;
}) {
  const quantity = input.quantity ?? input.stockPlateIds?.length ?? 1;
  const label = input.customerName || input.jobName || "İş";
  await notifyStock({
    ...input,
    eventType: NotificationEventType.STOCK.STOCK_CONSUMED,
    source: "stock-consumption",
    refId: input.refId ?? input.jobId ?? input.stockMovementIds?.[0] ?? undefined,
    refType: input.refType ?? "StockMovement",
    url: input.url ?? stockUrl({ phaseId: input.phaseId ?? input.schedulePhaseId, jobId: input.jobId }),
    message: input.message || `${label} için ${quantity} plaka stoktan tüketildi.`,
    metadata: {
      reservationIds: input.reservationIds ?? [],
      stockPlateIds: input.stockPlateIds ?? [],
      stockMovementIds: input.stockMovementIds ?? [],
      jobId: input.jobId ?? null,
      workScheduleId: input.workScheduleId ?? null,
      phaseId: input.phaseId ?? input.schedulePhaseId ?? null,
      schedulePhaseId: input.schedulePhaseId ?? input.phaseId ?? null,
      phaseOperationId: input.phaseOperationId ?? null,
      quantity,
      amount: input.amount ?? null,
      ...input.metadata,
    },
  });
}

export async function notifyOffcutCreated(input: StockNotificationInput & {
  offcutIds?: string[];
  offcutCodes?: string[];
  stockPlateId?: string | null;
  stockMovementIds?: string[];
  jobId?: string | null;
  jobName?: string | null;
  customerName?: string | null;
  phaseId?: string | null;
  schedulePhaseId?: string | null;
  phaseOperationId?: string | null;
  quantity?: number | null;
  amount?: number | null;
}) {
  const quantity = input.quantity ?? input.offcutIds?.length ?? 1;
  const label = input.offcutCodes?.length
    ? input.offcutCodes.join(", ")
    : input.jobName || input.customerName || "Offcut";
  await notifyStock({
    ...input,
    eventType: NotificationEventType.STOCK.OFFCUT_CREATED,
    source: "stock-offcut",
    refId: input.refId ?? input.offcutIds?.[0] ?? input.stockPlateId ?? undefined,
    refType: input.refType ?? "StockOffcut",
    url: input.url ?? stockUrl({ phaseId: input.phaseId ?? input.schedulePhaseId, jobId: input.jobId }),
    message: input.message || `Offcut oluşturuldu: ${label}${quantity > 1 ? ` (${quantity} parça)` : ""}.`,
    metadata: {
      offcutIds: input.offcutIds ?? [],
      offcutCodes: input.offcutCodes ?? [],
      stockPlateId: input.stockPlateId ?? null,
      stockMovementIds: input.stockMovementIds ?? [],
      jobId: input.jobId ?? null,
      phaseId: input.phaseId ?? input.schedulePhaseId ?? null,
      schedulePhaseId: input.schedulePhaseId ?? input.phaseId ?? null,
      phaseOperationId: input.phaseOperationId ?? null,
      quantity,
      amount: input.amount ?? null,
      ...input.metadata,
    },
  });
}

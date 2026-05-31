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

const PIPELINE_VERSION = "N5E";
const PERSONNEL_URL = "/dashboard/personel";
const CUSTOMER_URL = "/dashboard/musteriler";

function nameFromParts(parts: Array<string | null | undefined>, fallback: string) {
  return parts.map((part) => String(part || "").trim()).filter(Boolean).join(" ") || fallback;
}

async function notify(input: ActorInput & {
  atolyeId: string;
  eventType: string;
  source: string;
  message: string;
  refId: string;
  refType: string;
  url: string;
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
    url: input.url,
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

export async function notifyPersonnelCreated(input: ActorInput & {
  atolyeId: string;
  targetPersonelId: string;
  ad?: string | null;
  soyad?: string | null;
  rolGrubu?: string | null;
  isPatron?: boolean | null;
}) {
  const personelName = nameFromParts([input.ad, input.soyad], "Personel");
  await notify({
    ...input,
    eventType: NotificationEventType.PERSONNEL.PERSONNEL_CREATED,
    source: "personnel",
    message: `Personel kaydı oluşturuldu: ${personelName}.`,
    refId: input.targetPersonelId,
    refType: "Personel",
    url: PERSONNEL_URL,
    metadata: {
      personelId: input.targetPersonelId,
      action: "created",
      rolGrubu: input.rolGrubu ?? null,
      isPatron: input.isPatron ?? false,
    },
  });
}

export async function notifyPersonnelPermissionChanged(input: ActorInput & {
  atolyeId: string;
  targetPersonelId: string;
  ad?: string | null;
  soyad?: string | null;
  action: "updated" | "permissions_changed" | "preferences_changed" | "patron_changed" | "deleted";
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const personelName = nameFromParts([input.ad, input.soyad], "Personel");
  const actionLabel = input.action === "deleted"
    ? "silindi"
    : input.action === "patron_changed"
      ? "patron bildirimi değişti"
      : input.action === "preferences_changed"
        ? "bildirim tercihleri değişti"
        : input.action === "permissions_changed"
          ? "yetkileri değişti"
          : "güncellendi";

  await notify({
    ...input,
    eventType: NotificationEventType.PERSONNEL.PERSONNEL_PERMISSION_CHANGED,
    source: "personnel",
    message: `Personel ${actionLabel}: ${personelName}.`,
    refId: input.targetPersonelId,
    refType: "Personel",
    url: PERSONNEL_URL,
    metadata: {
      personelId: input.targetPersonelId,
      action: input.action,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    },
  });
}

export async function notifyCustomerCreated(input: ActorInput & {
  atolyeId: string;
  customerId: string;
  firmaAdi?: string | null;
  ad?: string | null;
  soyad?: string | null;
  musteriTipi?: string | null;
}) {
  const customerName = input.firmaAdi || nameFromParts([input.ad, input.soyad], "Müşteri");
  await notify({
    ...input,
    eventType: NotificationEventType.CUSTOMER.CUSTOMER_CREATED,
    source: "customer",
    message: `Müşteri oluşturuldu: ${customerName}.`,
    refId: input.customerId,
    refType: "Musteri",
    url: CUSTOMER_URL,
    metadata: {
      customerId: input.customerId,
      action: "created",
      musteriTipi: input.musteriTipi ?? null,
    },
  });
}

export async function notifyCustomerUpdated(input: ActorInput & {
  atolyeId: string;
  customerId: string;
  firmaAdi?: string | null;
  ad?: string | null;
  soyad?: string | null;
  action: "updated" | "deleted";
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const customerName = input.firmaAdi || nameFromParts([input.ad, input.soyad], "Müşteri");
  await notify({
    ...input,
    eventType: NotificationEventType.CUSTOMER.CUSTOMER_UPDATED,
    source: "customer",
    message: `Müşteri ${input.action === "deleted" ? "silindi" : "güncellendi"}: ${customerName}.`,
    refId: input.customerId,
    refType: "Musteri",
    url: CUSTOMER_URL,
    metadata: {
      customerId: input.customerId,
      action: input.action,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
    },
  });
}

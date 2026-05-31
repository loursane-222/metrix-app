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

const PIPELINE_VERSION = "N5F";
const FINANCE_URL = "/dashboard/tahsilatlar";

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
  url?: string;
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
    url: input.url ?? FINANCE_URL,
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

export async function notifyCollectionCreated(input: ActorInput & {
  atolyeId: string;
  collectionId: string;
  customerId: string;
  customerName: string;
  jobId?: string | null;
  jobName?: string | null;
  amount: number;
}) {
  await notify({
    ...input,
    eventType: NotificationEventType.FINANCE.COLLECTION_CREATED,
    source: "finance",
    message: `${input.customerName} — ${formatMoney(input.amount)} tahsilat alındı${input.jobName ? ` (${input.jobName})` : ""}.`,
    refId: input.collectionId,
    refType: "Tahsilat",
    metadata: {
      collectionId: input.collectionId,
      customerId: input.customerId,
      jobId: input.jobId ?? null,
      amount: input.amount,
      action: "created",
    },
  });
}

export async function notifyPaymentPlanCreated(input: ActorInput & {
  atolyeId: string;
  paymentPlanId: string;
  customerId?: string | null;
  customerName?: string | null;
  jobId: string;
  jobName?: string | null;
  amount: number;
  installmentCount?: number | null;
}) {
  await notify({
    ...input,
    eventType: NotificationEventType.FINANCE.PAYMENT_PLAN_CREATED,
    source: "finance",
    message: `Ödeme planı oluşturuldu: ${input.customerName || input.jobName || "İş"}, ${formatMoney(input.amount)}.`,
    refId: input.paymentPlanId,
    refType: "OdemePlani",
    url: `${FINANCE_URL}?isId=${input.jobId}`,
    metadata: {
      paymentPlanId: input.paymentPlanId,
      customerId: input.customerId ?? null,
      jobId: input.jobId,
      amount: input.amount,
      installmentCount: input.installmentCount ?? null,
      action: "created",
    },
  });
}

export async function notifyCustomerStatementSent(input: ActorInput & {
  atolyeId: string;
  customerId: string;
  customerName: string;
  channel?: string | null;
}) {
  await notify({
    ...input,
    eventType: NotificationEventType.FINANCE.CUSTOMER_STATEMENT_SENT,
    source: "finance",
    message: `Müşteri ekstresi gönderildi: ${input.customerName}.`,
    refId: input.customerId,
    refType: "Musteri",
    metadata: {
      customerId: input.customerId,
      channel: input.channel ?? null,
      action: "statement_sent",
    },
  });
}

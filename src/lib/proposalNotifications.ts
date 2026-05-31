import { logActivity } from "@/lib/activityLogger";
import {
  getNotificationEventConfig,
  NotificationEventType,
  shouldAwaitPushForEvent,
} from "@/lib/notificationCatalog";

type ProposalJobContext = {
  id: string;
  atolyeId: string;
  teklifNo?: string | null;
  musteriId?: string | null;
  musteriAdi?: string | null;
  satisFiyati?: unknown;
  kdvDahilFiyat?: unknown;
};

type NotifyProposalApprovedInput = {
  job: ProposalJobContext;
  source: "public-proposal" | "admin-proposal" | "job-status";
  userId?: string | null;
  personelId?: string | null;
};

type ProposalSmallEventAction = "viewed" | "pdf_opened" | "updated" | "rejected";

type NotifyProposalSmallEventInput = {
  job: ProposalJobContext;
  action: ProposalSmallEventAction;
  source: "public-proposal" | "admin-proposal" | "job-status";
  userId?: string | null;
  personelId?: string | null;
  viewCount?: number | null;
  metadata?: Record<string, unknown>;
};

function formatMoney(value: unknown) {
  const amount = Number(value || 0);
  return amount.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export async function notifyProposalApproved(input: NotifyProposalApprovedInput) {
  const eventType = NotificationEventType.SALES.PROPOSAL_APPROVED;
  const eventConfig = getNotificationEventConfig(eventType);
  const pushAwaited = shouldAwaitPushForEvent(eventType);
  const job = input.job;
  const teklifNo = job.teklifNo || "Teklif";
  const musteriAdi = job.musteriAdi || "Müşteri";
  const amount = Number(job.kdvDahilFiyat || job.satisFiyati || 0);

  await logActivity({
    atolyeId: job.atolyeId,
    userId: input.userId ?? undefined,
    personelId: input.personelId ?? undefined,
    type: eventType,
    eventType,
    category: eventConfig.category,
    severity: eventConfig.severity,
    source: input.source,
    title: eventConfig.defaultTitle,
    message: `${musteriAdi} - ${teklifNo} teklifi onaylandı${amount > 0 ? `. Tutar: ${formatMoney(amount)} TL` : "."}`,
    refId: job.id,
    refType: "Is",
    url: `/dashboard/isler?isId=${job.id}`,
    metadata: {
      eventType,
      teklifNo,
      jobId: job.id,
      musteriId: job.musteriId ?? null,
      source: input.source,
      notificationPipelineVersion: "N5B",
      pushAwaited,
    },
    awaitPush: pushAwaited,
  });
}

function proposalSmallEventType(action: ProposalSmallEventAction) {
  if (action === "updated") return NotificationEventType.SALES.PROPOSAL_UPDATED;
  if (action === "rejected") return NotificationEventType.SALES.PROPOSAL_REJECTED;
  return NotificationEventType.SALES.PROPOSAL_VIEWED;
}

function proposalSmallEventMessage(input: NotifyProposalSmallEventInput) {
  const teklifNo = input.job.teklifNo || "Teklif";
  const musteriAdi = input.job.musteriAdi || "Müşteri";
  if (input.action === "pdf_opened") return `${musteriAdi} - ${teklifNo} PDF teklifini açtı.`;
  if (input.action === "updated") return `${musteriAdi} - ${teklifNo} teklifi güncellendi.`;
  if (input.action === "rejected") return `${musteriAdi} - ${teklifNo} teklifi kaybedildi.`;
  const countText = input.viewCount ? ` (${input.viewCount}. görünüm)` : "";
  return `${musteriAdi} - ${teklifNo} teklifini açtı${countText}.`;
}

export async function notifyProposalSmallEvent(input: NotifyProposalSmallEventInput) {
  const eventType = proposalSmallEventType(input.action);
  const eventConfig = getNotificationEventConfig(eventType);
  const pushAwaited = shouldAwaitPushForEvent(eventType);
  const job = input.job;

  await logActivity({
    atolyeId: job.atolyeId,
    userId: input.userId ?? undefined,
    personelId: input.personelId ?? undefined,
    type: eventType,
    eventType,
    category: eventConfig.category,
    severity: eventConfig.severity,
    source: input.source,
    title: eventConfig.defaultTitle,
    message: proposalSmallEventMessage(input),
    refId: job.id,
    refType: "Is",
    url: `/dashboard/isler?isId=${job.id}`,
    metadata: {
      eventType,
      teklifNo: job.teklifNo ?? null,
      jobId: job.id,
      musteriId: job.musteriId ?? null,
      action: input.action,
      source: input.source,
      viewCount: input.viewCount ?? null,
      notificationPipelineVersion: "N5H",
      pushAwaited,
      ...(input.metadata ?? {}),
    },
    awaitPush: pushAwaited,
    skipPush: input.action === "viewed" || input.action === "pdf_opened",
  });
}

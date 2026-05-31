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

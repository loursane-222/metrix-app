import { logActivity } from "@/lib/activityLogger";
import {
  getNotificationEventConfig,
  NotificationEventType,
  shouldAwaitPushForEvent,
} from "@/lib/notificationCatalog";

const phaseLabel: Record<string, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
  TAS_ALINACAK: "Taş Alınacak",
};

function toIso(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function sameDateTime(a?: Date | string | null, b?: Date | string | null) {
  return toIso(a) === toIso(b);
}

export function hasSchedulePhaseDateChanged(params: {
  oldPlannedStart?: Date | string | null;
  newPlannedStart?: Date | string | null;
  oldPlannedEnd?: Date | string | null;
  newPlannedEnd?: Date | string | null;
}) {
  return (
    !sameDateTime(params.oldPlannedStart, params.newPlannedStart) ||
    !sameDateTime(params.oldPlannedEnd, params.newPlannedEnd)
  );
}

export async function notifySchedulePhaseDateChanged(params: {
  atolyeId: string;
  userId?: string | null;
  personelId?: string | null;
  source: string;
  phaseId: string;
  phaseType: string;
  workScheduleId: string;
  jobName: string;
  oldPlannedStart?: Date | string | null;
  newPlannedStart?: Date | string | null;
  oldPlannedEnd?: Date | string | null;
  newPlannedEnd?: Date | string | null;
}) {
  if (
    !hasSchedulePhaseDateChanged({
      oldPlannedStart: params.oldPlannedStart,
      newPlannedStart: params.newPlannedStart,
      oldPlannedEnd: params.oldPlannedEnd,
      newPlannedEnd: params.newPlannedEnd,
    })
  ) {
    return;
  }

  const fazAdi = phaseLabel[params.phaseType] || params.phaseType;
  const dateText = params.newPlannedStart
    ? new Date(params.newPlannedStart).toLocaleDateString("tr-TR")
    : "boş";
  const deepLink = `/dashboard/is-programi?phaseId=${params.phaseId}`;
  const eventType = NotificationEventType.SCHEDULE.PHASE_DATE_CHANGED;
  const eventConfig = getNotificationEventConfig(eventType);

  await logActivity({
    atolyeId: params.atolyeId,
    userId: params.userId || undefined,
    personelId: params.personelId || undefined,
    type: eventType,
    eventType,
    category: eventConfig.category,
    severity: eventConfig.severity,
    source: params.source,
    title: eventConfig.defaultTitle,
    message: `${params.jobName} – ${fazAdi} fazının tarihi ${dateText} olarak güncellendi.`,
    refId: params.phaseId,
    refType: "schedule_phase",
    url: deepLink,
    metadata: {
      source: params.source,
      phaseId: params.phaseId,
      phaseType: params.phaseType,
      workScheduleId: params.workScheduleId,
      oldPlannedStart: toIso(params.oldPlannedStart),
      newPlannedStart: toIso(params.newPlannedStart),
      oldPlannedEnd: toIso(params.oldPlannedEnd),
      newPlannedEnd: toIso(params.newPlannedEnd),
      notificationPipelineVersion: "N1",
      pushAwaited: shouldAwaitPushForEvent(eventType),
    },
    awaitPush: shouldAwaitPushForEvent(eventType),
  });
}

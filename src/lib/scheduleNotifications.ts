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

type JobContext = {
  jobId: string;
  jobName?: string | null;
  customerName?: string | null;
};

type PhaseContext = JobContext & {
  atolyeId: string;
  workScheduleId: string;
  phaseId: string;
  phaseType: string;
};

type OperationContext = PhaseContext & {
  phaseOperationId: string;
  operationType: "KESIM" | "TOPLAMA" | string;
};

function phaseUrl(phaseId: string) {
  return `/dashboard/is-programi?phaseId=${phaseId}`;
}

function jobLabel(input: JobContext) {
  return input.customerName || input.jobName || "İş";
}

function phaseLabel(phaseType: string) {
  if (phaseType === "OLCU") return "Ölçü";
  if (phaseType === "IMALAT") return "İmalat";
  if (phaseType === "MONTAJ") return "Montaj";
  return phaseType;
}

function operationLabel(operationType: string) {
  if (operationType === "KESIM") return "Kesim";
  if (operationType === "TOPLAMA") return "Toplama";
  return operationType;
}

async function notify(input: {
  atolyeId: string;
  eventType: string;
  source: string;
  message: string;
  refId: string;
  refType: string;
  url: string;
  metadata: Record<string, unknown>;
} & ActorInput) {
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
    actorId: input.actorId ?? undefined,
    actorName: input.actorName ?? undefined,
    metadata: {
      eventType: input.eventType,
      category: eventConfig.category,
      source: input.source,
      notificationPipelineVersion: "N5C",
      pushAwaited,
      ...input.metadata,
    },
    awaitPush: pushAwaited,
  });
}

export async function notifyJobScheduled(input: PhaseContext & ActorInput) {
  const eventType = NotificationEventType.JOB.JOB_SCHEDULED;
  await notify({
    ...input,
    eventType,
    source: "schedule",
    message: `${jobLabel(input)} işi programa alındı.`,
    refId: input.workScheduleId,
    refType: "WorkSchedule",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
    },
  });
}

export async function notifyPhaseAssigned(input: PhaseContext & ActorInput & {
  assignedPersonelIds?: string[];
  assignedPersonelNames?: string[];
  action?: "added" | "changed" | "removed";
}) {
  const eventType = NotificationEventType.SCHEDULE.PHASE_ASSIGNED;
  const names = input.assignedPersonelNames?.filter(Boolean).join(", ");
  const action = input.action ?? "changed";
  const suffix = action === "removed"
    ? "ataması kaldırıldı"
    : action === "added"
      ? "fazına atandı"
      : "faz ataması değişti";

  await notify({
    ...input,
    eventType,
    source: "schedule-assignment",
    message: names
      ? `${names} - ${jobLabel(input)} ${phaseLabel(input.phaseType)} ${suffix}.`
      : `${jobLabel(input)} ${phaseLabel(input.phaseType)} ${suffix}.`,
    refId: input.phaseId,
    refType: "SchedulePhase",
    url: phaseUrl(input.phaseId),
    metadata: {
      action,
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
      assignedPersonelIds: input.assignedPersonelIds ?? [],
      assignedPersonelNames: input.assignedPersonelNames ?? [],
    },
  });
}

export async function notifyPhaseAssignmentRemoved(input: Parameters<typeof notifyPhaseAssigned>[0]) {
  await notifyPhaseAssigned({ ...input, action: "removed" });
}

export async function notifyPhaseCompleted(input: PhaseContext & ActorInput) {
  const eventType = NotificationEventType.SCHEDULE.PHASE_COMPLETED;
  await notify({
    ...input,
    eventType,
    source: "schedule",
    message: `${jobLabel(input)} - ${phaseLabel(input.phaseType)} fazı tamamlandı.`,
    refId: input.phaseId,
    refType: "SchedulePhase",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
    },
  });
}

export async function notifyPhaseReopened(input: PhaseContext & ActorInput) {
  const eventType = NotificationEventType.SCHEDULE.PHASE_REOPENED;
  await notify({
    ...input,
    eventType,
    source: "schedule",
    message: `${jobLabel(input)} - ${phaseLabel(input.phaseType)} fazı yeniden açıldı.`,
    refId: input.phaseId,
    refType: "SchedulePhase",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
    },
  });
}

export async function notifyPhaseNoteAdded(input: PhaseContext & ActorInput & {
  note?: string | null;
}) {
  const eventType = NotificationEventType.SCHEDULE.PHASE_NOTE_ADDED;
  await notify({
    ...input,
    eventType,
    source: "schedule-note",
    message: `${jobLabel(input)} - ${phaseLabel(input.phaseType)} fazına not eklendi.`,
    refId: input.phaseId,
    refType: "SchedulePhase",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
      note: input.note ?? null,
      notificationPipelineVersion: "N5H",
    },
  });
}

export async function notifyProductionOperationReady(input: OperationContext & ActorInput) {
  const eventType = input.operationType === "KESIM"
    ? NotificationEventType.PRODUCTION.CUTTING_READY
    : NotificationEventType.PRODUCTION.ASSEMBLY_READY;
  const label = operationLabel(input.operationType);
  await notify({
    ...input,
    eventType,
    source: "production-operation",
    message: `${jobLabel(input)} - ${input.jobName || "ürün"} ${label.toLocaleLowerCase("tr-TR")} için hazır.`,
    refId: input.phaseOperationId,
    refType: "SchedulePhaseOperation",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
      phaseOperationId: input.phaseOperationId,
      operationType: input.operationType,
      operationStatus: "READY",
    },
  });
}

export async function notifyProductionOperationCompleted(input: OperationContext & ActorInput) {
  const eventType = input.operationType === "KESIM"
    ? NotificationEventType.PRODUCTION.CUTTING_COMPLETED
    : NotificationEventType.PRODUCTION.ASSEMBLY_COMPLETED;
  const label = operationLabel(input.operationType);
  await notify({
    ...input,
    eventType,
    source: "production-operation",
    message: `${jobLabel(input)} - ${label} tamamlandı.`,
    refId: input.phaseOperationId,
    refType: "SchedulePhaseOperation",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
      phaseOperationId: input.phaseOperationId,
      operationType: input.operationType,
      operationStatus: "COMPLETED",
    },
  });
}

export async function notifyInstallationCompleted(input: PhaseContext & ActorInput) {
  const eventType = NotificationEventType.INSTALLATION.INSTALLATION_COMPLETED;
  await notify({
    ...input,
    eventType,
    source: "schedule",
    message: `${jobLabel(input)} - Montaj tamamlandı.`,
    refId: input.phaseId,
    refType: "SchedulePhase",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
    },
  });
}

export async function notifyStoneBrokenInCutting(input: OperationContext & ActorInput & {
  reasonCode?: string | null;
  failureDescription?: string | null;
  materialLossCost?: number | null;
}) {
  const eventType = NotificationEventType.PRODUCTION.STONE_BROKEN_IN_CUTTING;
  await notify({
    ...input,
    eventType,
    source: "production-operation",
    message: `${jobLabel(input)} - Kesimde taş kırıldı.`,
    refId: input.phaseOperationId,
    refType: "SchedulePhaseOperation",
    url: phaseUrl(input.phaseId),
    metadata: {
      jobId: input.jobId,
      workScheduleId: input.workScheduleId,
      phaseId: input.phaseId,
      schedulePhaseId: input.phaseId,
      phaseType: input.phaseType,
      phaseOperationId: input.phaseOperationId,
      operationType: input.operationType,
      reasonCode: input.reasonCode ?? null,
      failureDescription: input.failureDescription ?? null,
      materialLossCost: input.materialLossCost ?? null,
    },
  });
}

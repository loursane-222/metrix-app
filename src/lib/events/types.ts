export type MetrixEventType =
  | "EXECUTION_STARTED"
  | "EXECUTION_PAUSED"
  | "EXECUTION_RESUMED"
  | "EXECUTION_COMPLETED"
  | "EXECUTION_CANNOT_START"
  | "NOTE_ADDED"
  | "PHOTO_ADDED"
  | "PROPOSAL_SENT"
  | "PROPOSAL_VIEWED"
  | "PROPOSAL_APPROVED"
  | "PROPOSAL_REJECTED"
  | "PAYMENT_ADDED"
  | "PAYMENT_REMINDER_SENT"
  | "PAYMENT_OVERDUE"
  | "COLLECTION_NOTE_ADDED"
  | "JOB_CREATED"
  | "JOB_UPDATED"
  | "JOB_STATUS_CHANGED"
  | "SCHEDULE_CREATED"
  | "SCHEDULE_PHASE_ASSIGNED"
  | "SCHEDULE_PHASE_DELAYED"
  | "MATERIAL_LOSS_REPORTED"
  | "RISK_SIGNAL_CREATED";

export type MetrixEventSeverity = "info" | "success" | "warning" | "critical";

export type MetrixEventSource =
  | "schedule"
  | "execution"
  | "sales"
  | "payments"
  | "jobs"
  | "system"
  | "risk";

export type MetrixEventEntityType =
  | "schedule"
  | "schedule_phase"
  | "execution"
  | "proposal"
  | "payment"
  | "collection"
  | "job"
  | "customer"
  | "risk_signal"
  | "system";

export type EmitMetrixEventInput = {
  atolyeId: string;
  type: MetrixEventType;
  source: MetrixEventSource;
  severity?: MetrixEventSeverity;
  entityType?: MetrixEventEntityType;
  entityId?: string | null;
  title: string;
  message: string;
  url?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorUserId?: string | null;
  actorPersonelId?: string | null;
  notify?: boolean;
  feed?: boolean;
  risk?: boolean;
  aiMemory?: boolean;
  payload?: Record<string, unknown>;
};

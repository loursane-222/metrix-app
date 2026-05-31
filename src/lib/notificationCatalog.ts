export const NotificationCategory = {
  SALES: "SALES",
  JOB: "JOB",
  SCHEDULE: "SCHEDULE",
  PRODUCTION: "PRODUCTION",
  INSTALLATION: "INSTALLATION",
  STOCK: "STOCK",
  FINANCE: "FINANCE",
  COSTING: "COSTING",
  CUSTOMER: "CUSTOMER",
  PERSONNEL: "PERSONNEL",
  RISK: "RISK",
  SYSTEM: "SYSTEM",
} as const;

export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NotificationSeverity = {
  INFO: "INFO",
  SUCCESS: "SUCCESS",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
} as const;

export type NotificationSeverity =
  (typeof NotificationSeverity)[keyof typeof NotificationSeverity];

export const NotificationAudienceHint = {
  OWNER: "OWNER",
  PATRON: "PATRON",
  ASSIGNED_PERSONNEL: "ASSIGNED_PERSONNEL",
  ROLE_GROUP: "ROLE_GROUP",
  ALL_STAFF: "ALL_STAFF",
} as const;

export type NotificationAudienceHint =
  (typeof NotificationAudienceHint)[keyof typeof NotificationAudienceHint];

export const NotificationEventType = {
  SALES: {
    PROPOSAL_SENT: "PROPOSAL_SENT",
    PROPOSAL_VIEWED: "PROPOSAL_VIEWED",
    PROPOSAL_APPROVED: "PROPOSAL_APPROVED",
    PROPOSAL_REJECTED: "PROPOSAL_REJECTED",
  },
  JOB: {
    JOB_CREATED: "JOB_CREATED",
    JOB_APPROVED: "JOB_APPROVED",
    JOB_SCHEDULED: "JOB_SCHEDULED",
    JOB_UPDATED: "JOB_UPDATED",
  },
  SCHEDULE: {
    PHASE_DATE_CHANGED: "PHASE_DATE_CHANGED",
    PHASE_ASSIGNED: "PHASE_ASSIGNED",
    PHASE_COMPLETED: "PHASE_COMPLETED",
    PHASE_REOPENED: "PHASE_REOPENED",
  },
  PRODUCTION: {
    CUTTING_READY: "CUTTING_READY",
    CUTTING_STARTED: "CUTTING_STARTED",
    CUTTING_COMPLETED: "CUTTING_COMPLETED",
    ASSEMBLY_READY: "ASSEMBLY_READY",
    ASSEMBLY_STARTED: "ASSEMBLY_STARTED",
    ASSEMBLY_COMPLETED: "ASSEMBLY_COMPLETED",
    STONE_BROKEN_IN_CUTTING: "STONE_BROKEN_IN_CUTTING",
  },
  INSTALLATION: {
    INSTALLATION_COMPLETED: "INSTALLATION_COMPLETED",
    INSTALLATION_BLOCKED: "INSTALLATION_BLOCKED",
  },
  STOCK: {
    STOCK_PRODUCT_CREATED: "STOCK_PRODUCT_CREATED",
    STOCK_ENTRY_CREATED: "STOCK_ENTRY_CREATED",
    STOCK_RESERVED: "STOCK_RESERVED",
    STOCK_CONSUMED: "STOCK_CONSUMED",
    OFFCUT_CREATED: "OFFCUT_CREATED",
  },
  FINANCE: {
    PAYMENT_PLAN_CREATED: "PAYMENT_PLAN_CREATED",
    COLLECTION_CREATED: "COLLECTION_CREATED",
    CUSTOMER_STATEMENT_SENT: "CUSTOMER_STATEMENT_SENT",
  },
  COSTING: {
    WORKSHOP_COST_CHANGED: "WORKSHOP_COST_CHANGED",
    AUTO_COST_RECALCULATED: "AUTO_COST_RECALCULATED",
  },
  CUSTOMER: {
    CUSTOMER_CREATED: "CUSTOMER_CREATED",
    CUSTOMER_UPDATED: "CUSTOMER_UPDATED",
  },
  PERSONNEL: {
    PERSONNEL_CREATED: "PERSONNEL_CREATED",
    PERSONNEL_ASSIGNED: "PERSONNEL_ASSIGNED",
    PERSONNEL_PERMISSION_CHANGED: "PERSONNEL_PERMISSION_CHANGED",
  },
  RISK: {
    RISK_CREATED: "RISK_CREATED",
    CRITICAL_RISK_CREATED: "CRITICAL_RISK_CREATED",
  },
  SYSTEM: {
    SYSTEM_NOTICE: "SYSTEM_NOTICE",
  },
} as const;

type ValueOf<T> = T[keyof T];
type NotificationEventGroups = typeof NotificationEventType;
export type NotificationEventType = ValueOf<{
  [Group in keyof NotificationEventGroups]: ValueOf<NotificationEventGroups[Group]>;
}>;

export type NotificationEventConfig = {
  category: NotificationCategory;
  severity: NotificationSeverity;
  critical: boolean;
  defaultTitle: string;
  defaultAudienceHint: NotificationAudienceHint[];
  requiresPushAwait: boolean;
  defaultActionUrl?: string;
};

const owner = [NotificationAudienceHint.OWNER];
const ownerAndPatron = [NotificationAudienceHint.OWNER, NotificationAudienceHint.PATRON];
const assignedPersonnel = [
  NotificationAudienceHint.OWNER,
  NotificationAudienceHint.ASSIGNED_PERSONNEL,
];
const roleGroup = [NotificationAudienceHint.OWNER, NotificationAudienceHint.ROLE_GROUP];

export const NotificationEventCatalog: Record<NotificationEventType, NotificationEventConfig> = {
  [NotificationEventType.SALES.PROPOSAL_SENT]: {
    category: NotificationCategory.SALES,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Teklif iletildi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.SALES.PROPOSAL_VIEWED]: {
    category: NotificationCategory.SALES,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Teklif görüntülendi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.SALES.PROPOSAL_APPROVED]: {
    category: NotificationCategory.SALES,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Teklif onaylandı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.SALES.PROPOSAL_REJECTED]: {
    category: NotificationCategory.SALES,
    severity: NotificationSeverity.WARNING,
    critical: false,
    defaultTitle: "Teklif reddedildi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.JOB.JOB_CREATED]: {
    category: NotificationCategory.JOB,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "İş oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.JOB.JOB_APPROVED]: {
    category: NotificationCategory.JOB,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "İş onaylandı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.JOB.JOB_SCHEDULED]: {
    category: NotificationCategory.JOB,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "İş programa alındı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.JOB.JOB_UPDATED]: {
    category: NotificationCategory.JOB,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "İş güncellendi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/isler",
  },
  [NotificationEventType.SCHEDULE.PHASE_DATE_CHANGED]: {
    category: NotificationCategory.SCHEDULE,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Faz tarihi değişti",
    defaultAudienceHint: assignedPersonnel,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.SCHEDULE.PHASE_ASSIGNED]: {
    category: NotificationCategory.SCHEDULE,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Faz ataması değişti",
    defaultAudienceHint: assignedPersonnel,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.SCHEDULE.PHASE_COMPLETED]: {
    category: NotificationCategory.SCHEDULE,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Faz tamamlandı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.SCHEDULE.PHASE_REOPENED]: {
    category: NotificationCategory.SCHEDULE,
    severity: NotificationSeverity.WARNING,
    critical: false,
    defaultTitle: "Faz yeniden açıldı",
    defaultAudienceHint: assignedPersonnel,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.CUTTING_READY]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Kesim hazır",
    defaultAudienceHint: roleGroup,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.CUTTING_STARTED]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Kesim başladı",
    defaultAudienceHint: roleGroup,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.CUTTING_COMPLETED]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Kesim tamamlandı",
    defaultAudienceHint: roleGroup,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.ASSEMBLY_READY]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Toplama hazır",
    defaultAudienceHint: roleGroup,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.ASSEMBLY_STARTED]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Toplama başladı",
    defaultAudienceHint: roleGroup,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.ASSEMBLY_COMPLETED]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Toplama tamamlandı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PRODUCTION.STONE_BROKEN_IN_CUTTING]: {
    category: NotificationCategory.PRODUCTION,
    severity: NotificationSeverity.CRITICAL,
    critical: true,
    defaultTitle: "Kesimde taş kırıldı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.INSTALLATION.INSTALLATION_COMPLETED]: {
    category: NotificationCategory.INSTALLATION,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Montaj tamamlandı",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.INSTALLATION.INSTALLATION_BLOCKED]: {
    category: NotificationCategory.INSTALLATION,
    severity: NotificationSeverity.CRITICAL,
    critical: true,
    defaultTitle: "Montaj durdu",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.STOCK.STOCK_PRODUCT_CREATED]: {
    category: NotificationCategory.STOCK,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Stok ürünü oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/stok",
  },
  [NotificationEventType.STOCK.STOCK_ENTRY_CREATED]: {
    category: NotificationCategory.STOCK,
    severity: NotificationSeverity.SUCCESS,
    critical: false,
    defaultTitle: "Stok girişi yapıldı",
    defaultAudienceHint: owner,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/stok",
  },
  [NotificationEventType.STOCK.STOCK_RESERVED]: {
    category: NotificationCategory.STOCK,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Stok rezerve edildi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/stok",
  },
  [NotificationEventType.STOCK.STOCK_CONSUMED]: {
    category: NotificationCategory.STOCK,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Stok tüketildi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/stok",
  },
  [NotificationEventType.STOCK.OFFCUT_CREATED]: {
    category: NotificationCategory.STOCK,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Fire parça oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/stok",
  },
  [NotificationEventType.FINANCE.PAYMENT_PLAN_CREATED]: {
    category: NotificationCategory.FINANCE,
    severity: NotificationSeverity.SUCCESS,
    critical: false,
    defaultTitle: "Ödeme planı oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/tahsilatlar",
  },
  [NotificationEventType.FINANCE.COLLECTION_CREATED]: {
    category: NotificationCategory.FINANCE,
    severity: NotificationSeverity.SUCCESS,
    critical: true,
    defaultTitle: "Tahsilat girildi",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/tahsilatlar",
  },
  [NotificationEventType.FINANCE.CUSTOMER_STATEMENT_SENT]: {
    category: NotificationCategory.FINANCE,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Ekstre gönderildi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/tahsilatlar",
  },
  [NotificationEventType.COSTING.WORKSHOP_COST_CHANGED]: {
    category: NotificationCategory.COSTING,
    severity: NotificationSeverity.WARNING,
    critical: false,
    defaultTitle: "Atölye maliyeti değişti",
    defaultAudienceHint: owner,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/atolye",
  },
  [NotificationEventType.COSTING.AUTO_COST_RECALCULATED]: {
    category: NotificationCategory.COSTING,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Maliyet yeniden hesaplandı",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/atolye",
  },
  [NotificationEventType.CUSTOMER.CUSTOMER_CREATED]: {
    category: NotificationCategory.CUSTOMER,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Müşteri oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/musteriler",
  },
  [NotificationEventType.CUSTOMER.CUSTOMER_UPDATED]: {
    category: NotificationCategory.CUSTOMER,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Müşteri güncellendi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/musteriler",
  },
  [NotificationEventType.PERSONNEL.PERSONNEL_CREATED]: {
    category: NotificationCategory.PERSONNEL,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Personel oluşturuldu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard/personel",
  },
  [NotificationEventType.PERSONNEL.PERSONNEL_ASSIGNED]: {
    category: NotificationCategory.PERSONNEL,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Personel atandı",
    defaultAudienceHint: assignedPersonnel,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/is-programi",
  },
  [NotificationEventType.PERSONNEL.PERSONNEL_PERMISSION_CHANGED]: {
    category: NotificationCategory.PERSONNEL,
    severity: NotificationSeverity.WARNING,
    critical: false,
    defaultTitle: "Personel yetkisi değişti",
    defaultAudienceHint: owner,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard/personel",
  },
  [NotificationEventType.RISK.RISK_CREATED]: {
    category: NotificationCategory.RISK,
    severity: NotificationSeverity.WARNING,
    critical: false,
    defaultTitle: "Risk oluştu",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard",
  },
  [NotificationEventType.RISK.CRITICAL_RISK_CREATED]: {
    category: NotificationCategory.RISK,
    severity: NotificationSeverity.CRITICAL,
    critical: true,
    defaultTitle: "Kritik risk oluştu",
    defaultAudienceHint: ownerAndPatron,
    requiresPushAwait: true,
    defaultActionUrl: "/dashboard",
  },
  [NotificationEventType.SYSTEM.SYSTEM_NOTICE]: {
    category: NotificationCategory.SYSTEM,
    severity: NotificationSeverity.INFO,
    critical: false,
    defaultTitle: "Sistem bildirimi",
    defaultAudienceHint: owner,
    requiresPushAwait: false,
    defaultActionUrl: "/dashboard",
  },
};

const fallbackEventType = NotificationEventType.SYSTEM.SYSTEM_NOTICE;

export function isKnownNotificationEventType(
  eventType: string
): eventType is NotificationEventType {
  return eventType in NotificationEventCatalog;
}

export function assertKnownNotificationEventType(
  eventType: string
): asserts eventType is NotificationEventType {
  if (!isKnownNotificationEventType(eventType)) {
    throw new Error(`Unknown notification event type: ${eventType}`);
  }
}

export function getNotificationEventConfig(eventType: string) {
  if (isKnownNotificationEventType(eventType)) {
    return NotificationEventCatalog[eventType];
  }

  return NotificationEventCatalog[fallbackEventType];
}

export function isCriticalNotificationEvent(eventType: string) {
  return getNotificationEventConfig(eventType).critical;
}

export function shouldAwaitPushForEvent(eventType: string) {
  return getNotificationEventConfig(eventType).requiresPushAwait;
}

export function getNotificationCategory(eventType: string) {
  return getNotificationEventConfig(eventType).category;
}

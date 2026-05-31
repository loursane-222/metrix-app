import { NotificationCategory, type NotificationCategory as NotificationCategoryValue } from "@/lib/notificationCatalog";

export type NotificationPreferenceInput = {
  category: NotificationCategoryValue;
  inApp: boolean;
  push: boolean;
};

export const notificationPreferenceCategories: Array<{
  category: NotificationCategoryValue;
  label: string;
}> = [
  { category: NotificationCategory.SALES, label: "Satış" },
  { category: NotificationCategory.JOB, label: "İşler" },
  { category: NotificationCategory.SCHEDULE, label: "İş Programı" },
  { category: NotificationCategory.PRODUCTION, label: "Üretim" },
  { category: NotificationCategory.INSTALLATION, label: "Montaj" },
  { category: NotificationCategory.STOCK, label: "Stok" },
  { category: NotificationCategory.FINANCE, label: "Finans/Tahsilat" },
  { category: NotificationCategory.COSTING, label: "Maliyet" },
  { category: NotificationCategory.CUSTOMER, label: "Müşteri" },
  { category: NotificationCategory.PERSONNEL, label: "Personel" },
  { category: NotificationCategory.RISK, label: "Risk" },
  { category: NotificationCategory.SYSTEM, label: "Sistem" },
];

const roleDefaults: Record<string, NotificationCategoryValue[]> = {
  OLCU: [NotificationCategory.SCHEDULE, NotificationCategory.JOB],
  KESIM: [NotificationCategory.PRODUCTION, NotificationCategory.SCHEDULE],
  TOPLAMA: [NotificationCategory.PRODUCTION, NotificationCategory.SCHEDULE],
  MONTAJ: [NotificationCategory.INSTALLATION, NotificationCategory.SCHEDULE],
  OFIS: [
    NotificationCategory.SALES,
    NotificationCategory.FINANCE,
    NotificationCategory.CUSTOMER,
    NotificationCategory.JOB,
  ],
  DIGER: [NotificationCategory.SCHEDULE],
};

export function getDefaultNotificationPreferencesForRole(
  rolGrubu?: string | null,
  isPatron = false
): NotificationPreferenceInput[] {
  const enabled = new Set(
    isPatron
      ? notificationPreferenceCategories.map((item) => item.category)
      : roleDefaults[rolGrubu || "DIGER"] || roleDefaults.DIGER
  );

  return notificationPreferenceCategories.map(({ category }) => ({
    category,
    inApp: enabled.has(category),
    push: enabled.has(category),
  }));
}

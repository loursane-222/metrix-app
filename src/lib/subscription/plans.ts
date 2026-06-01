export const PLAN_ORDER = ["demo", "basic", "pro", "business"] as const;

export type SubscriptionPlan = (typeof PLAN_ORDER)[number];

export type PlanFeature = {
  title: string;
  description: string;
};

export type PlanDetails = {
  plan: SubscriptionPlan;
  label: string;
  shortLabel: string;
  price: string;
  priceNote?: string;
  audience: string;
  accent: string;
  features: PlanFeature[];
  checkoutUrl?: string;
};

export const DEFAULT_CHECKOUT_URLS: Partial<Record<SubscriptionPlan, string>> = {
  basic: "https://www.shopier.com/metrixtezgah/47680244",
  pro: "https://www.shopier.com/metrixtezgah/47680266",
  business: "https://www.shopier.com/metrixtezgah/47680284",
};

const PLAN_DETAILS: Record<SubscriptionPlan, PlanDetails> = {
  demo: {
    plan: "demo",
    label: "Demo",
    shortLabel: "Demo",
    price: "Ücretsiz",
    audience: "Metrix'i teklif ve müşteri akışıyla denemek isteyen atölyeler",
    accent: "slate",
    features: [
      { title: "Dashboard", description: "Genel iş ve teklif görünümü" },
      { title: "İşler / Teklifler", description: "Teklif oluşturma ve takip" },
      { title: "Müşteriler", description: "Temel müşteri kayıtları" },
    ],
  },
  basic: {
    plan: "basic",
    label: "Basic",
    shortLabel: "Basic",
    price: "₺1.950 / ay",
    priceNote: "+ KDV · yıllık 2 ay bedava",
    audience: "Tahsilat ve cari takibini Metrix içinde yapmak isteyen ekipler",
    accent: "emerald",
    checkoutUrl: DEFAULT_CHECKOUT_URLS.basic,
    features: [
      { title: "Atölye ayarları", description: "" },
      { title: "Müşteri yönetimi", description: "" },
      { title: "Hızlı teklif (çok-mahalli)", description: "" },
      { title: "WhatsApp'tan gönderme", description: "" },
      { title: "\"Görüntülendi\" bildirimi", description: "" },
      { title: "Tahsilat takibi", description: "" },
      { title: "1-2 kullanıcı", description: "" },
    ],
  },
  pro: {
    plan: "pro",
    label: "Pro",
    shortLabel: "Pro",
    price: "₺4.450 / ay",
    priceNote: "+ KDV · yıllık 2 ay bedava",
    audience: "Planlama, personel ve atölye maliyetlerini tek yerden yöneten işletmeler",
    accent: "blue",
    checkoutUrl: DEFAULT_CHECKOUT_URLS.pro,
    features: [
      { title: "Basic'teki her şey dahil", description: "" },
      { title: "Personel yönetimi", description: "" },
      { title: "Onaylanmış iş: program + takip", description: "" },
      { title: "Otomatik takip + sıcak/soğuk", description: "" },
      { title: "İşletme içi akıllı bildirimler", description: "" },
      { title: "5 kullanıcı", description: "" },
    ],
  },
  business: {
    plan: "business",
    label: "Business",
    shortLabel: "Business",
    price: "₺8.900 / ay",
    priceNote: "+ KDV · yıllık 2 ay bedava",
    audience: "Stok, optimizasyon ve ileri operasyon kontrolü isteyen büyüyen ekipler",
    accent: "violet",
    checkoutUrl: DEFAULT_CHECKOUT_URLS.business,
    features: [
      { title: "Pro'daki her şey dahil", description: "" },
      { title: "Detaylı stok + plaka planlayıcı", description: "" },
      { title: "Dashboard (yönetim ekranı)", description: "" },
      { title: "Tüm bildirimler + çok şube", description: "" },
      { title: "Sınırsız kullanıcı", description: "" },
    ],
  },
};

export const ROUTE_MIN_PLAN: Record<string, SubscriptionPlan> = {
  "/dashboard": "demo",
  "/dashboard/abonelik": "demo",
  "/dashboard/onboarding": "demo",
  "/dashboard/isler": "demo",
  "/dashboard/yeni-is-v3": "demo",
  "/dashboard/yeni-is-v4": "demo",
  "/dashboard/hizli-teklif": "demo",
  "/dashboard/musteriler": "demo",
  "/dashboard/tahsilatlar": "basic",
  "/dashboard/is-programi": "pro",
  "/dashboard/personel": "pro",
  "/dashboard/atolye": "pro",
  "/dashboard/stok": "business",
  "/dashboard/plaka-planlayici": "business",
};

export const PURCHASABLE_PLANS: SubscriptionPlan[] = ["basic", "pro", "business"];

export function normalizePlan(plan: unknown): SubscriptionPlan {
  if (typeof plan !== "string") return "demo";
  const normalized = plan.trim().toLowerCase();
  return PLAN_ORDER.includes(normalized as SubscriptionPlan)
    ? (normalized as SubscriptionPlan)
    : "demo";
}

export function hasPlanAccess(currentPlan: unknown, requiredPlan: unknown): boolean {
  const current = normalizePlan(currentPlan);
  const required = normalizePlan(requiredPlan);
  return PLAN_ORDER.indexOf(current) >= PLAN_ORDER.indexOf(required);
}

export function isActiveDemoTrial(currentPlan: unknown, abonelikBitis: unknown): boolean {
  if (normalizePlan(currentPlan) !== "demo") return false;
  if (!abonelikBitis) return false;

  const endDate = abonelikBitis instanceof Date
    ? abonelikBitis
    : new Date(String(abonelikBitis));

  return Number.isFinite(endDate.getTime()) && endDate > new Date();
}

export function hasSubscriptionAccess(
  currentPlan: unknown,
  requiredPlan: unknown,
  abonelikBitis?: unknown,
): boolean {
  if (isActiveDemoTrial(currentPlan, abonelikBitis)) return true;
  return hasPlanAccess(currentPlan, requiredPlan);
}

export function getPlanRank(plan: unknown): number {
  return PLAN_ORDER.indexOf(normalizePlan(plan));
}

export function getPlanLabel(plan: unknown): string {
  return PLAN_DETAILS[normalizePlan(plan)].label;
}

export function getPlanFeatures(plan: unknown): PlanFeature[] {
  return PLAN_DETAILS[normalizePlan(plan)].features;
}

export function getPlanDetails(plan: unknown): PlanDetails {
  return PLAN_DETAILS[normalizePlan(plan)];
}

export function getAllPlanDetails(): PlanDetails[] {
  return PLAN_ORDER.map((plan) => PLAN_DETAILS[plan]);
}

export function getPurchasablePlanDetails(): PlanDetails[] {
  return PURCHASABLE_PLANS.map((plan) => PLAN_DETAILS[plan]);
}

export function getDefaultCheckoutUrl(plan: unknown): string | null {
  return DEFAULT_CHECKOUT_URLS[normalizePlan(plan)] || null;
}

export function getRequiredPlanForPath(pathname: string): SubscriptionPlan {
  const cleanPath = pathname.split("?")[0] || "/dashboard";
  const match = Object.keys(ROUTE_MIN_PLAN)
    .sort((a, b) => b.length - a.length)
    .find((route) => cleanPath === route || cleanPath.startsWith(`${route}/`));

  return match ? ROUTE_MIN_PLAN[match] : "demo";
}

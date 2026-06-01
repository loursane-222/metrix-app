const TRIAL_DAYS = 14;
const REMINDER_DAYS_USED = [9, 11, 13] as const;
const DAY_MS = 24 * 60 * 60 * 1000;

type TrialUser = {
  abonelikPlani?: unknown;
  abonelikBitis?: unknown;
};

export type TrialStatus = {
  isDemo: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  daysUsed: number;
  shouldShowTrialReminder: boolean;
};

function isDemoPlan(plan: unknown): boolean {
  return typeof plan === "string" ? plan.trim().toLowerCase() === "demo" : true;
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function getTrialStatus(user: TrialUser | null | undefined): TrialStatus {
  const isDemo = isDemoPlan(user?.abonelikPlani);
  const endDate = toDate(user?.abonelikBitis);

  if (!isDemo) {
    return {
      isDemo: false,
      isTrialActive: false,
      isTrialExpired: false,
      daysLeft: 0,
      daysUsed: 0,
      shouldShowTrialReminder: false,
    };
  }

  if (!endDate) {
    return {
      isDemo: true,
      isTrialActive: false,
      isTrialExpired: true,
      daysLeft: 0,
      daysUsed: TRIAL_DAYS,
      shouldShowTrialReminder: false,
    };
  }

  const now = new Date();
  const rawDaysLeft = Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS);
  const daysLeft = Math.max(0, rawDaysLeft);
  const daysUsed = Math.min(TRIAL_DAYS, Math.max(0, TRIAL_DAYS - daysLeft));
  const isTrialActive = endDate > now;
  const isTrialExpired = !isTrialActive;
  const shouldShowTrialReminder =
    isTrialActive && REMINDER_DAYS_USED.includes(daysUsed as (typeof REMINDER_DAYS_USED)[number]);

  return {
    isDemo: true,
    isTrialActive,
    isTrialExpired,
    daysLeft,
    daysUsed,
    shouldShowTrialReminder,
  };
}

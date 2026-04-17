export type PhaseType = "OLCU" | "IMALAT" | "MONTAJ";

export const PHASE_ORDER: PhaseType[] = ["OLCU", "IMALAT", "MONTAJ"];

export const PHASE_LABELS: Record<PhaseType, string> = {
  OLCU: "Ölçü",
  IMALAT: "İmalat",
  MONTAJ: "Montaj",
};

export const PHASE_COLORS: Record<PhaseType, { bg: string; text: string; border: string }> = {
  OLCU: {
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  IMALAT: {
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  MONTAJ: {
    bg: "bg-green-50 dark:bg-green-950",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
  },
};

export interface SchedulePhase {
  id: string;
  workScheduleId: string;
  phase: PhaseType;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  isCompleted: boolean;
  completedAt: Date | null;
  completedBy: string | null;
  isOverridden: boolean;
  overrideNote: string | null;
  notes: string | null;
}

export interface WorkSchedule {
  id: string;
  isId: string;
  startDate: Date | null;
  endDate: Date | null;
  notes: string | null;
  phases: SchedulePhase[];
}

export interface ScheduleWithIs extends WorkSchedule {
  is: {
    id: string;
    teklifNo: string;
    musteriAdi: string;
    urunAdi: string;
  };
}

export function getCurrentPhase(phases: SchedulePhase[]): PhaseType | "TAMAMLANDI" {
  for (const phaseType of PHASE_ORDER) {
    const phase = phases.find((p) => p.phase === phaseType);
    if (!phase || !phase.isCompleted) return phaseType;
  }
  return "TAMAMLANDI";
}

export function canCompletePhase(
  phases: SchedulePhase[],
  targetPhase: PhaseType
): { allowed: boolean; reason?: string } {
  const targetIndex = PHASE_ORDER.indexOf(targetPhase);
  for (let i = 0; i < targetIndex; i++) {
    const prevPhaseType = PHASE_ORDER[i];
    const prevPhase = phases.find((p) => p.phase === prevPhaseType);
    if (!prevPhase?.isCompleted) {
      return {
        allowed: false,
        reason: `${PHASE_LABELS[prevPhaseType]} aşaması henüz tamamlanmadı`,
      };
    }
  }
  return { allowed: true };
}

"use client";

import { useState, useTransition } from "react";
import { togglePhaseCompletion } from "@/app/actions/schedule";
import { PhaseType, PHASE_LABELS, PHASE_COLORS, canCompletePhase, type SchedulePhase } from "@/lib/types/schedule";

interface PhaseBadgeProps {
  phase: SchedulePhase;
  allPhases: SchedulePhase[];
  compact?: boolean;
  onToggle?: () => void;
}

export function PhaseBadge({ phase, allPhases, compact = false, onToggle }: PhaseBadgeProps) {
  const [isPending, startTransition] = useTransition();
  const [showOverride, setShowOverride] = useState(false);
  const [overrideNote, setOverrideNote] = useState("");

  const colors = PHASE_COLORS[phase.phase as PhaseType];
  const label = PHASE_LABELS[phase.phase as PhaseType];
  const { allowed, reason } = canCompletePhase(allPhases, phase.phase as PhaseType);
  const isBlocked = !allowed && !phase.isCompleted;

  function handleClick() {
    if (isPending) return;
    if (phase.isCompleted) {
      startTransition(async () => {
        await togglePhaseCompletion({ schedulePhaseId: phase.id, isCompleted: false });
        onToggle?.();
      });
      return;
    }
    if (isBlocked) { setShowOverride(true); return; }
    startTransition(async () => {
      await togglePhaseCompletion({ schedulePhaseId: phase.id, isCompleted: true });
      onToggle?.();
    });
  }

  function handleOverrideConfirm() {
    if (!overrideNote.trim()) return;
    startTransition(async () => {
      await togglePhaseCompletion({ schedulePhaseId: phase.id, isCompleted: true, overrideNote: overrideNote.trim() });
      setShowOverride(false);
      setOverrideNote("");
      onToggle?.();
    });
  }

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border cursor-pointer select-none transition-opacity ${colors.bg} ${colors.text} ${colors.border} ${phase.isCompleted ? "opacity-100" : "opacity-60"} ${isPending ? "opacity-40 pointer-events-none" : "hover:opacity-100"}`}
        onClick={handleClick}
        title={phase.isCompleted ? `${label}: Tamamlandı` : label}
      >
        {phase.isCompleted ? "✓ " : isBlocked ? "🔒 " : ""}{label}
      </span>
    );
  }

  return (
    <>
      <div
        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-150 select-none ${colors.bg} ${colors.border} ${isPending ? "opacity-50 pointer-events-none" : "hover:shadow-sm"} ${phase.isCompleted ? "ring-1 ring-inset" : ""}`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border ${colors.text} ${colors.border}`}>
            {phase.phase === "OLCU" ? "1" : phase.phase === "IMALAT" ? "2" : "3"}
          </span>
          <div>
            <div className={`text-sm font-medium ${colors.text}`}>{label}</div>
            {phase.plannedStart && phase.plannedEnd && (
              <div className="text-xs text-gray-500 mt-0.5">
                {new Date(phase.plannedStart).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – {new Date(phase.plannedEnd).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
              </div>
            )}
            {phase.isOverridden && (
              <div className="text-xs text-amber-600 mt-0.5">⚠ Override: {phase.overrideNote}</div>
            )}
          </div>
        </div>
        <div>
          {isPending ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-50" />
          ) : isBlocked && !phase.isCompleted ? (
            <span className="text-lg opacity-40" title={reason}>🔒</span>
          ) : phase.isCompleted ? (
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">✓</div>
          ) : (
            <div className={`w-6 h-6 rounded-full border-2 ${colors.border}`} />
          )}
        </div>
      </div>

      {showOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-2 mb-3">
              <span>⚠️</span>
              <h3 className="font-semibold">Sıra Dışı Tamamlama</h3>
            </div>
            <p className="text-sm text-gray-500 mb-1">{reason}</p>
            <p className="text-sm text-gray-500 mb-4">Yine de işaretlemek için gerekçe girin:</p>
            <textarea
              className="w-full border rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Gerekçe..."
              value={overrideNote}
              onChange={(e) => setOverrideNote(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50" onClick={() => { setShowOverride(false); setOverrideNote(""); }}>İptal</button>
              <button className="px-4 py-2 text-sm rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50" onClick={handleOverrideConfirm} disabled={!overrideNote.trim() || isPending}>
                Yine de Tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

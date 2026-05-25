import { roundMinutes, roundMoney, roundPercent } from "./rounding";
import type { LaborV1Comparable, LaborV2Comparison, LaborV2Result } from "./types";

function severity(deltaPercent: number): LaborV2Comparison["severity"] {
  const abs = Math.abs(deltaPercent);
  if (abs >= 50) return "critical";
  if (abs >= 20) return "warning";
  if (abs > 0) return "info";
  return "neutral";
}

export function compareLaborV1V2(v1: LaborV1Comparable = {}, v2: LaborV2Result): LaborV2Comparison {
  const v1Minutes = roundMinutes(v1.totalMinutes || 0);
  const v1LaborCost = roundMoney(v1.laborCost || 0);
  const v1TotalCost = roundMoney(v1.totalCost || 0);
  const v2Minutes = roundMinutes(v2.totalMinutes);
  const v2LaborCost = roundMoney(v2.totalLaborCost);
  const laborDelta = roundMoney(v2LaborCost - v1LaborCost);

  return {
    v1LaborCost,
    v2LaborCost,
    deltaAmount: laborDelta,
    deltaPercent: v1LaborCost > 0 ? roundPercent((laborDelta / v1LaborCost) * 100) : 0,
    severity: severity(v1LaborCost > 0 ? roundPercent((laborDelta / v1LaborCost) * 100) : 0),
    v1: {
      totalMinutes: v1Minutes,
      laborCost: v1LaborCost,
      totalCost: v1TotalCost,
    },
    v2: {
      totalMinutes: v2Minutes,
      laborCost: v2LaborCost,
    },
    delta: {
      minutes: roundMinutes(v2Minutes - v1Minutes),
      laborCost: laborDelta,
      laborCostPercent: v1LaborCost > 0 ? roundPercent((laborDelta / v1LaborCost) * 100) : 0,
    },
    warnings: [...v2.warnings],
  };
}

import type { LaborV2Result } from "./types";

export function buildLaborV2Explain(result: LaborV2Result): string[] {
  if (result.explain.length > 0) return [...result.explain];
  if (result.breakdownRows.length === 0) return [];

  return result.breakdownRows
    .filter((row) => row.applied)
    .map((row) => {
      if (row.formula) return row.formula;
      if (row.minutes > 0 && row.minuteCost > 0) return `${row.label}: ${row.minutes} dk x ${row.minuteCost} TL/dk = ${row.cost} TL`;
      if (row.cost > 0) return `${row.label}: +${row.cost} TL`;
      return `${row.label}: ${row.minutes} dk`;
    });
}

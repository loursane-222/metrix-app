import assert from "node:assert/strict";
import { compareLaborV1V2 } from "../compare";
import { calculateLaborV2 } from "../engine";

export function testCompareLaborV1V2ReturnsFlatDeltaFields() {
  const v2 = calculateLaborV2({
    economics: { shopMinuteCost: 100 },
    operations: [
      { key: "tezgah", label: "Tezgah", category: "FABRICATION_BASE", totalMinutes: 10 },
    ],
    config: { setup: { baseMinutes: 0 } },
  });
  const comparison = compareLaborV1V2({ laborCost: 800, totalMinutes: 8, totalCost: 1200 }, v2);

  assert.equal(comparison.v1LaborCost, 800);
  assert.equal(comparison.v2LaborCost, 1000);
  assert.equal(comparison.deltaAmount, 200);
  assert.equal(comparison.deltaPercent, 25);
  assert.equal(comparison.severity, "warning");
}

export function testCompareLaborV1V2SeverityThresholds() {
  const makeV2 = (totalLaborCost: number) =>
    calculateLaborV2({
      economics: { shopMinuteCost: totalLaborCost },
      operations: [
        { key: "op", label: "Operasyon", category: "FABRICATION_BASE", totalMinutes: 1 },
      ],
      config: { setup: { baseMinutes: 0 } },
    });

  assert.equal(compareLaborV1V2({ laborCost: 100 }, makeV2(100)).severity, "neutral");
  assert.equal(compareLaborV1V2({ laborCost: 100 }, makeV2(110)).severity, "info");
  assert.equal(compareLaborV1V2({ laborCost: 100 }, makeV2(120)).severity, "warning");
  assert.equal(compareLaborV1V2({ laborCost: 100 }, makeV2(150)).severity, "critical");
  assert.equal(compareLaborV1V2({ laborCost: 100 }, makeV2(50)).severity, "critical");
}

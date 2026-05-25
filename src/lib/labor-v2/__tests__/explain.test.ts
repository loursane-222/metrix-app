import assert from "node:assert/strict";
import { calculateLaborV2 } from "../engine";
import { buildLaborV2Explain } from "../explain";

export function testBuildLaborV2ExplainReturnsStableStrings() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 50 },
    operations: [
      { key: "tezgah", label: "Tezgah işleme", category: "FABRICATION_BASE", totalMinutes: 10 },
    ],
    config: {
      setup: { baseMinutes: 5 },
      risk: { laborRiskRate: 0.1 },
    },
  });

  assert.deepEqual(buildLaborV2Explain(result), [
    "Tezgah işleme: 10 dk",
    "Setup: 5 dk",
    "Risk buffer: +75 TL",
  ]);
}

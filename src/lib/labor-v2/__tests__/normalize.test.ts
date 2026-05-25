import assert from "node:assert/strict";
import { LABOR_V2_CUTOUT_DEFAULT_MINUTES } from "../defaults";
import { normalizeLaborV2Input } from "../normalize";

export function testNormalizeLaborV2InputMergesDefaults() {
  const input = normalizeLaborV2Input({
    config: {
      setup: { baseMinutes: 15 },
      floor: { minimumCost: 1000 },
    },
  });

  assert.equal(input.version, "labor-v2");
  assert.equal(input.config.setup.baseMinutes, 15);
  assert.equal(input.config.setup.perMachineChangeMinutes, 0);
  assert.equal(input.config.floor.minimumCost, 1000);
  assert.equal(input.config.floor.minimumMinutes, 0);
  assert.deepEqual(input.operations, []);
  assert.equal(input.config.multipliers.shape.oval, 1.15);
  assert.equal(LABOR_V2_CUTOUT_DEFAULT_MINUTES.eviye, 20);
  assert.equal(LABOR_V2_CUTOUT_DEFAULT_MINUTES.ocak, 20);
  assert.equal(LABOR_V2_CUTOUT_DEFAULT_MINUTES.priz, 5);
}

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { calculateLaborV2 } from "../engine";
import type { LaborV2Input, LaborV2OperationCategory } from "../types";

interface LaborV2Fixture {
  name: string;
  input: LaborV2Input;
  expected: {
    version: "labor-v2";
    totalMinutes: number;
    totalLaborCost: number;
    warningKeys: string[];
    adjustmentKeys: string[];
    breakdownCategories: LaborV2OperationCategory[];
  };
}

export function testCalculateLaborV2ReturnsStableEmptyShape() {
  const result = calculateLaborV2({});

  assert.equal(result.version, "labor-v2");
  assert.equal(result.totalMinutes, 0);
  assert.equal(result.totalLaborCost, 0);
  assert.deepEqual(result.breakdownRows, []);
  assert.deepEqual(result.adjustments, []);
  assert.deepEqual(result.warnings.map((warning) => warning.key), ["default_config_used"]);
  assert.deepEqual(result.explain, []);
}

export function testSimpleOperationCost() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 50 },
    operations: [
      { key: "tezgah", label: "Tezgah işleme", category: "FABRICATION_BASE", totalMinutes: 100 },
    ],
    config: { setup: { baseMinutes: 0, perComplexShapeMinutes: 0 } },
  });

  assert.equal(result.totalMinutes, 100);
  assert.equal(result.totalLaborCost, 5000);
  assert.equal(result.effectiveMinuteCost, 50);
  assert.equal(result.breakdownRows[0].key, "tezgah");
}

export function testSetupApplied() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 40 },
    operations: [
      { key: "tezgah", label: "Tezgah işleme", category: "FABRICATION_BASE", totalMinutes: 20 },
    ],
    config: { setup: { baseMinutes: 15 } },
  });

  assert.equal(result.breakdownRows.some((row) => row.key === "setup"), true);
  assert.equal(result.totalMinutes, 35);
  assert.equal(result.costBreakdown.setupCost, 600);
}

export function testMinimumFloorApplied() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 50 },
    operations: [
      { key: "small", label: "Küçük işlem", category: "CUTOUT", totalMinutes: 10 },
    ],
    config: { setup: { baseMinutes: 0 }, floor: { minimumCost: 1000 } },
  });

  assert.equal(result.totalLaborCost, 1000);
  assert.equal(result.costBreakdown.minimumFloorAdjustment, 500);
  assert.equal(result.warnings.some((warning) => warning.key === "minimum_floor_applied"), true);
}

export function testShapeMultiplierApplied() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 100 },
    operations: [
      { key: "shape", label: "Oval parça", category: "FABRICATION_BASE", totalMinutes: 100, shapeType: "oval" },
    ],
    config: { setup: { baseMinutes: 0, perComplexShapeMinutes: 0 } },
  });

  assert.equal(result.totalMinutes, 115);
  assert.equal(result.costBreakdown.shapeDifficultyCost, 1500);
  assert.equal(result.adjustments.some((adjustment) => adjustment.key === "shape_difficulty"), true);
}

export function testRiskBufferApplied() {
  const result = calculateLaborV2({
    economics: { shopMinuteCost: 100 },
    operations: [
      { key: "risk", label: "Riskli işlem", category: "FABRICATION_BASE", totalMinutes: 10 },
    ],
    config: { setup: { baseMinutes: 0 }, risk: { laborRiskRate: 0.1 } },
  });

  assert.equal(result.totalLaborCost, 1100);
  assert.equal(result.costBreakdown.riskFireBufferCost, 100);
  assert.equal(result.warnings.some((warning) => warning.key === "risk_buffer_applied"), true);
}

export function testMissingEconomicsWarning() {
  const result = calculateLaborV2({
    operations: [
      { key: "missing", label: "Eksik maliyet", category: "FABRICATION_BASE", totalMinutes: 10 },
    ],
    config: { setup: { baseMinutes: 0 } },
  });

  assert.equal(result.totalLaborCost, 0);
  assert.equal(result.warnings.some((warning) => warning.key === "missing_machine_cost"), true);
  assert.equal(result.warnings.some((warning) => warning.key === "missing_shop_minute_cost"), true);
}

export function testDeterministicSameInputSameOutput() {
  const input: LaborV2Input = {
    project: { hasBookmatch: true, projectDifficulty: "HIGH" },
    economics: { shopMinuteCost: 80 },
    operations: [
      { key: "a", label: "A", category: "FABRICATION_BASE", totalMinutes: 30, shapeType: "l_parca" },
      { key: "b", label: "B", category: "EDGE", quantity: 2, minutesPerUnit: 5 },
    ],
    config: { floor: { minimumCost: 5000 }, risk: { laborRiskRate: 0.05 } },
  };

  const first = calculateLaborV2(input);
  const second = calculateLaborV2(input);
  const third = calculateLaborV2(input);

  assert.deepEqual(first, second);
  assert.deepEqual(second, third);
}

export function testCalculateLaborV2DoesNotMutateInput() {
  const input: LaborV2Input = {
    project: { hasDamarTakibi: true, projectDifficulty: "HIGH" },
    economics: { shopMinuteCost: 75 },
    operations: [
      { key: "tezgah", label: "Tezgah", category: "FABRICATION_BASE", totalMinutes: 12, shapeType: "oval" },
    ],
    config: {
      setup: { baseMinutes: 3 },
      risk: { laborRiskRate: 0.05 },
      multipliers: { shape: { oval: 1.2 } },
    },
    metadata: { source: "mutation-test" },
  };
  const before = JSON.stringify(input);

  calculateLaborV2(input);

  assert.equal(JSON.stringify(input), before);
}

export function testBreakdownOrderingIsStable() {
  const result = calculateLaborV2({
    project: { hasDamarTakibi: true, hasBookmatch: true, projectDifficulty: "HIGH" },
    economics: { shopMinuteCost: 100 },
    operations: [
      { key: "tezgah", label: "Tezgah", category: "FABRICATION_BASE", totalMinutes: 20, shapeType: "oval" },
      { key: "edge", label: "Pahlama", category: "EDGE", totalMinutes: 5 },
    ],
    config: {
      setup: { baseMinutes: 10 },
      floor: { minimumCost: 7000 },
      risk: { laborRiskRate: 0.1 },
    },
  });

  assert.deepEqual(result.breakdownRows.map((row) => row.key), [
    "tezgah",
    "edge",
    "setup",
    "shape_difficulty",
    "project_difficulty",
    "damar_bookmatch",
    "minimum_floor",
    "risk_fire_buffer",
  ]);
}

export function testFixtureExpectations() {
  const fixturesDir = join(process.cwd(), "src/lib/labor-v2/fixtures");
  const fixtureFiles = readdirSync(fixturesDir)
    .filter((file) => file.endsWith(".json"))
    .sort();

  assert.deepEqual(fixtureFiles, [
    "minimum-floor.json",
    "missing-economics.json",
    "shape-heavy.json",
    "simple-tezgah.json",
  ]);

  for (const file of fixtureFiles) {
    const fixture = JSON.parse(readFileSync(join(fixturesDir, file), "utf8")) as LaborV2Fixture;
    const result = calculateLaborV2(fixture.input);

    assert.equal(result.version, fixture.expected.version, fixture.name);
    assert.equal(result.totalMinutes, fixture.expected.totalMinutes, fixture.name);
    assert.equal(result.totalLaborCost, fixture.expected.totalLaborCost, fixture.name);
    assert.deepEqual(result.warnings.map((warning) => warning.key), fixture.expected.warningKeys, fixture.name);
    assert.deepEqual(result.adjustments.map((adjustment) => adjustment.key), fixture.expected.adjustmentKeys, fixture.name);
    assert.deepEqual(
      result.breakdownRows.map((row) => row.category),
      fixture.expected.breakdownCategories,
      fixture.name
    );
  }
}

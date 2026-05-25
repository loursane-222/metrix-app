import {
  testBreakdownOrderingIsStable,
  testCalculateLaborV2DoesNotMutateInput,
  testCalculateLaborV2ReturnsStableEmptyShape,
  testDeterministicSameInputSameOutput,
  testFixtureExpectations,
  testMinimumFloorApplied,
  testMissingEconomicsWarning,
  testRiskBufferApplied,
  testSetupApplied,
  testShapeMultiplierApplied,
  testSimpleOperationCost,
} from "./__tests__/engine.test";
import {
  testCompareLaborV1V2ReturnsFlatDeltaFields,
  testCompareLaborV1V2SeverityThresholds,
} from "./__tests__/compare.test";
import { testBuildLaborV2ExplainReturnsStableStrings } from "./__tests__/explain.test";
import { testNormalizeLaborV2InputMergesDefaults } from "./__tests__/normalize.test";
import { testRoundingHelpersAreConsistent } from "./__tests__/rounding.test";

const tests: Array<[string, () => void]> = [
  ["calculate empty shape", testCalculateLaborV2ReturnsStableEmptyShape],
  ["simple operation cost", testSimpleOperationCost],
  ["setup applied", testSetupApplied],
  ["minimum floor applied", testMinimumFloorApplied],
  ["shape multiplier applied", testShapeMultiplierApplied],
  ["risk buffer applied", testRiskBufferApplied],
  ["missing economics warning", testMissingEconomicsWarning],
  ["deterministic same input same output", testDeterministicSameInputSameOutput],
  ["input mutation guard", testCalculateLaborV2DoesNotMutateInput],
  ["breakdown ordering stable", testBreakdownOrderingIsStable],
  ["fixture expectations", testFixtureExpectations],
  ["compare flat delta fields", testCompareLaborV1V2ReturnsFlatDeltaFields],
  ["compare severity thresholds", testCompareLaborV1V2SeverityThresholds],
  ["explain stable strings", testBuildLaborV2ExplainReturnsStableStrings],
  ["normalize merges defaults", testNormalizeLaborV2InputMergesDefaults],
  ["rounding helpers", testRoundingHelpersAreConsistent],
];

for (const [name, run] of tests) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length} labor-v2 tests passed`);

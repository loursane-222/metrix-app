import {
  testMaterialGroupFixtures,
  testMaterialGroupKeysAreUniquePerGroup,
  testMaterialGroupSummariesUseUniqueAreaAndProductCounts,
  testEffectiveMaterialSelectionUsesPieceOverride,
  testEffectiveMaterialSelectionUsesProductDefault,
  testMaterialGroupIdIsDerivedFromEffectiveMaterial,
  testQuoteLinesCanSplitSameAreaProductByMaterialGroup,
  testWasteIsCostOnlyAndNotSeparateCustomerQuoteLine,
} from "./__tests__/material-groups.test";

const tests: Array<[string, () => void]> = [
  ["material group fixtures", testMaterialGroupFixtures],
  ["material group unique keys", testMaterialGroupKeysAreUniquePerGroup],
  ["material group summary counts", testMaterialGroupSummariesUseUniqueAreaAndProductCounts],
  ["effective material uses product default", testEffectiveMaterialSelectionUsesProductDefault],
  ["effective material uses piece override", testEffectiveMaterialSelectionUsesPieceOverride],
  ["quote lines split by material group", testQuoteLinesCanSplitSameAreaProductByMaterialGroup],
  ["waste stays cost-only for quote", testWasteIsCostOnlyAndNotSeparateCustomerQuoteLine],
  ["material group id derives from effective material", testMaterialGroupIdIsDerivedFromEffectiveMaterial],
];

for (const [name, run] of tests) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length} yeni-is-v5 tests passed`);

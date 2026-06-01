import {
  testMaterialGroupFixtures,
  testMaterialGroupKeysAreUniquePerGroup,
  testMaterialGroupSummariesUseUniqueAreaAndProductCounts,
} from "./__tests__/material-groups.test";

const tests: Array<[string, () => void]> = [
  ["material group fixtures", testMaterialGroupFixtures],
  ["material group unique keys", testMaterialGroupKeysAreUniquePerGroup],
  ["material group summary counts", testMaterialGroupSummariesUseUniqueAreaAndProductCounts],
];

for (const [name, run] of tests) {
  run();
  console.log(`ok - ${name}`);
}

console.log(`${tests.length} yeni-is-v5 tests passed`);

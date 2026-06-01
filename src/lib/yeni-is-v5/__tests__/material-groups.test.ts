import assert from "node:assert/strict";
import { materialGroupFixtures } from "../fixtures/material-groups";
import { rebuildMaterialGroups, summarizeMaterialGroup } from "../domain";

export function testMaterialGroupFixtures() {
  for (const fixture of materialGroupFixtures) {
    const groups = rebuildMaterialGroups(fixture.job);

    assert.equal(groups.length, fixture.expected.groupCount, fixture.name);

    const summaries = groups.map((group) => ({
      materialName: group.material.materialName,
      source: group.material.source,
      shadeCode: group.material.shadeCode,
      ...summarizeMaterialGroup(fixture.job, group),
    }));

    const normalizedSummaries = summaries
      .map((summary) => ({
        materialName: summary.materialName,
        source: summary.source,
        shadeCode: summary.shadeCode,
        areaCount: summary.areaCount,
        productCount: summary.productCount,
        totalPieceCount: summary.totalPieceCount,
        totalAreaCm2: summary.totalAreaCm2,
        totalLinearMeter: summary.totalLinearMeter,
      }))
      .sort(compareSummary);

    const expectedSummaries = [...fixture.expected.summaries].sort(compareSummary);

    assert.deepEqual(normalizedSummaries, expectedSummaries, fixture.name);
  }
}

export function testMaterialGroupKeysAreUniquePerGroup() {
  for (const fixture of materialGroupFixtures) {
    const groups = rebuildMaterialGroups(fixture.job);
    const keys = groups.map((group) => group.key);

    assert.equal(new Set(keys).size, keys.length, fixture.name);
  }
}

export function testMaterialGroupSummariesUseUniqueAreaAndProductCounts() {
  const fixture = materialGroupFixtures.find((candidate) => candidate.name === "same area same material");

  assert.ok(fixture);

  const [group] = rebuildMaterialGroups(fixture.job);
  const summary = summarizeMaterialGroup(fixture.job, group);

  assert.equal(summary.areaCount, 1);
  assert.equal(summary.productCount, 1);
  assert.equal(summary.totalPieceCount, 2);
}

type ComparableSummary = {
  materialName: string;
  source: string;
  shadeCode?: string;
};

function compareSummary(left: ComparableSummary, right: ComparableSummary): number {
  return `${left.materialName}|${left.source}|${left.shadeCode ?? ""}`.localeCompare(
    `${right.materialName}|${right.source}|${right.shadeCode ?? ""}`,
  );
}

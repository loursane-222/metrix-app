import assert from "node:assert/strict";
import { roundMinutes, roundMoney, roundPercent } from "../rounding";

export function testRoundingHelpersAreConsistent() {
  assert.equal(roundMoney(10.005), 10.01);
  assert.equal(roundMoney("12.345"), 12.35);
  assert.equal(roundMoney(Number.NaN), 0);
  assert.equal(roundMinutes(1.234), 1.23);
  assert.equal(roundMinutes(1.235), 1.24);
  assert.equal(roundPercent(12.345), 12.35);
}

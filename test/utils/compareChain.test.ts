import { chainComparators } from "../../src/utils/compareChain";

describe("chainComparators", () => {
  it("returns 0 when given no comparators", () => {
    expect(chainComparators<number>()(1, 2)).toBe(0);
  });

  it("uses the first comparator that returns a non-zero result", () => {
    const alwaysEqual = () => 0;
    const bBeforeA = () => 1;
    const aBeforeB = () => -1;

    const combined = chainComparators(alwaysEqual, bBeforeA, aBeforeB);
    expect(combined(1, 2)).toBe(1);
  });

  it("falls back to 0 when all comparators tie", () => {
    const combined = chainComparators<number>(() => 0, () => 0);
    expect(combined(1, 2)).toBe(0);
  });

  it("can sort an array using the combined comparator", () => {
    const byEvenFirst = (a: number, b: number) => Number(a % 2 !== 0) - Number(b % 2 !== 0);
    const byValue = (a: number, b: number) => a - b;
    const sorted = [5, 4, 3, 2, 1].sort(chainComparators(byEvenFirst, byValue));
    expect(sorted).toEqual([2, 4, 1, 3, 5]);
  });
});

import { arrayRange } from "../../src/utils/arrayRange";

describe("arrayRange", () => {
  it("returns a range from 1 to 5 with step 1", () => {
    expect(arrayRange(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("returns a range from -1 to 4 with step 1", () => {
    expect(arrayRange(-1, 4, 1)).toEqual([-1, 0, 1, 2, 3, 4]);
  });

  it("returns a range from 0 to 10 with step 2", () => {
    expect(arrayRange(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it("returns a range from 10 to 0 with negative step", () => {
    expect(arrayRange(10, 0, -2)).toEqual([10, 8, 6, 4, 2, 0]);
  });

  it("returns a single element when start === stop", () => {
    expect(arrayRange(3, 3, 1)).toEqual([3]);
  });

  it("throws or returns empty if step would create an invalid range", () => {
    expect(arrayRange(5, 1, 1)).toEqual([]);
  });

  it("handles negative steps with equal start and stop", () => {
    expect(arrayRange(-3, -3, -1)).toEqual([-3]);
  });
});

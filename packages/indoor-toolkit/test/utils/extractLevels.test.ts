import { extractLevels } from "../../src";

describe("extractLevels", () => {
  it("returns empty array for empty string", () => {
    expect(extractLevels("")).toEqual([]);
  });

  it("returns single number in array", () => {
    expect(extractLevels("5")).toEqual([5]);
  });

  it("parses negative number correctly", () => {
    expect(extractLevels("-2")).toEqual([-2]);
  });

  it("parses range input", () => {
    expect(extractLevels("1-3")).toEqual([1, 2, 3]);
  });

  it("handles multi-digit range input", () => {
    expect(extractLevels("10-12")).toEqual([10, 11, 12]);
  });

  it("parses range input with negative numbers", () => {
    expect(extractLevels("-1-3")).toEqual([-1, 0, 1, 2, 3]);
  });

  it("handles ranges between two negative levels", () => {
    expect(extractLevels("-3--1")).toEqual([-3, -2, -1]);
  });

  it("handles semicolon-separated values", () => {
    expect(extractLevels("1;3-5")).toEqual([1, 3, 4, 5]);
  });

  it("trims input before processing", () => {
    expect(extractLevels("  2  ")).toEqual([2]);
  });

  it("returns empty array for non-numeric and non-range input", () => {
    expect(extractLevels("abc")).toEqual([]);
  });

  it("recursively handles nested semicolon + range", () => {
    expect(extractLevels("1;2-3;5")).toEqual([1, 2, 3, 5]);
  });

  it("handles decimal input as single level", () => {
    expect(extractLevels("2.5")).toEqual([2.5]);
  });

  it("handles numeric level arrays", () => {
    expect(extractLevels([0, 1, 2])).toEqual([0, 1, 2]);
  });

  it("handles mixed level arrays", () => {
    expect(extractLevels([1, "3-4"])).toEqual([1, 3, 4]);
  });
});

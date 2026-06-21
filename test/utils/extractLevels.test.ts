import { extractLevels } from "../../src/utils/extractLevels";
import { arrayRange } from "../../src/utils/arrayRange";

jest.mock("../../src/utils/arrayRange");

const mockArrayRange = arrayRange as jest.MockedFunction<typeof arrayRange>;

describe("extractLevels", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array for empty string", () => {
    expect(extractLevels("")).toEqual([]);
  });

  it("returns single number in array", () => {
    expect(extractLevels("5")).toEqual([5]);
  });

  it("parses negative number correctly", () => {
    expect(extractLevels("-2")).toEqual([-2]);
  });

  it("calls arrayRange for range input", () => {
    mockArrayRange.mockReturnValue([1, 2, 3]);
    const result = extractLevels("1-3");
    expect(mockArrayRange).toHaveBeenCalledWith(1, 3, 1);
    expect(result).toEqual([1, 2, 3]);
  });

  it("handles multi-digit range input", () => {
    mockArrayRange.mockReturnValue([10, 11, 12]);
    const result = extractLevels("10-12");
    expect(mockArrayRange).toHaveBeenCalledWith(10, 12, 1);
    expect(result).toEqual([10, 11, 12]);
  });

  it("calls arrayRange for range input with negative numbers", () => {
    mockArrayRange.mockReturnValue([-1, 0, 1, 2, 3]);
    const result = extractLevels("-1-3");
    expect(mockArrayRange).toHaveBeenCalledWith(-1, 3, 1);
    expect(result).toEqual([-1, 0, 1, 2, 3]);
  });

  it("handles ranges between two negative levels", () => {
    mockArrayRange.mockReturnValue([-3, -2, -1]);
    const result = extractLevels("-3--1");
    expect(mockArrayRange).toHaveBeenCalledWith(-3, -1, 1);
    expect(result).toEqual([-3, -2, -1]);
  });

  it("handles semicolon-separated values", () => {
    mockArrayRange.mockImplementation((start, stop) =>
      Array.from({ length: stop - start + 1 }, (_, i) => start + i)
    );

    const result = extractLevels("1;3-5");
    expect(result).toEqual([1, 3, 4, 5]);
    expect(mockArrayRange).toHaveBeenCalledWith(3, 5, 1);
  });

  it("trims input before processing", () => {
    expect(extractLevels("  2  ")).toEqual([2]);
  });

  it("returns empty array for non-numeric and non-range input", () => {
    expect(extractLevels("abc")).toEqual([]);
  });

  it("recursively handles nested semicolon + range", () => {
    mockArrayRange.mockImplementation((start, stop) =>
      Array.from({ length: stop - start + 1 }, (_, i) => start + i)
    );

    const result = extractLevels("1;2-3;5");
    expect(result).toEqual([1, 2, 3, 5]);
    expect(mockArrayRange).toHaveBeenCalledWith(2, 3, 1);
  });

  it("handles decimal input as single level", () => {
    expect(extractLevels("2.5")).toEqual([2.5]);
  });

  it("handles numeric level arrays", () => {
    expect(extractLevels([0, 1, 2])).toEqual([0, 1, 2]);
  });

  it("handles mixed level arrays", () => {
    mockArrayRange.mockReturnValue([3, 4]);
    expect(extractLevels([1, "3-4"])).toEqual([1, 3, 4]);
  });
});

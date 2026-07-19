import { parsePositiveMeters } from "../../src/utils/tagValueHelpers";

describe("parsePositiveMeters", () => {
  it("parses positive numeric tag values", () => {
    expect(parsePositiveMeters("1.25")).toBe(1.25);
  });

  it("ignores missing, non-numeric, zero, and negative values", () => {
    expect(parsePositiveMeters(undefined)).toBeUndefined();
    expect(parsePositiveMeters("wide")).toBeUndefined();
    expect(parsePositiveMeters("0")).toBeUndefined();
    expect(parsePositiveMeters("-1")).toBeUndefined();
  });
});

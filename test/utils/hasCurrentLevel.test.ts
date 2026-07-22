import { hasLevel } from "../../src/utils/hasCurrentLevel";

const createFeature = (props: Record<string, any>): GeoJSON.Feature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [0, 0] },
  properties: props,
});

describe("hasLevel", () => {
  it("matches when level is a string and equal", () => {
    const feature = createFeature({ level: "1" });
    expect(hasLevel(feature, 1)).toBe(true);
  });

  it("matches when level is an array and includes level", () => {
    const feature = createFeature({ level: [0, 1, 2] });
    expect(hasLevel(feature, 1)).toBe(true);
  });

  it("matches when repeat_on is a single level string", () => {
    const feature = createFeature({ repeat_on: "2" });
    expect(hasLevel(feature, 2)).toBe(true);
  });

  it("matches when repeat_on is semicolon-separated and includes level", () => {
    const feature = createFeature({ repeat_on: "0;1;2" });
    expect(hasLevel(feature, 1)).toBe(true);
  });

  it("matches when repeat_on is a range (e.g., 1-3) and includes level", () => {
    const feature = createFeature({ repeat_on: "1-3" });
    expect(hasLevel(feature, 2)).toBe(true);
  });

  it("matches multi-digit repeat_on ranges", () => {
    const feature = createFeature({ repeat_on: "10-12" });
    expect(hasLevel(feature, 11)).toBe(true);
  });

  it("matches negative repeat_on ranges", () => {
    const feature = createFeature({ repeat_on: "-3--1" });
    expect(hasLevel(feature, -2)).toBe(true);
  });

  it("does not match when level is not found", () => {
    const feature = createFeature({ level: "3" });
    expect(hasLevel(feature, 1)).toBe(false);
  });
});

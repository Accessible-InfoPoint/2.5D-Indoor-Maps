import { hasLevel, hasCurrentLevel } from "../../src/utils/hasCurrentLevel";

jest.mock("../../src/main", () => ({
  geoMap: {
    getCurrentLevel: jest.fn(),
  },
}));
import { geoMap } from "../../src/main"; // to mock geoMap

const createFeature = (props: Record<string, any>): GeoJSON.Feature => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [0, 0] },
  properties: props,
});

describe("hasLevel", () => {
  it("matches when level is a string and equal", () => {
    const feature = createFeature({ level: "1" });
    expect(hasLevel(feature, "1")).toBe(true);
  });

  it("matches when level is an array and includes level", () => {
    const feature = createFeature({ level: ["0", "1", "2"] });
    expect(hasLevel(feature, "1")).toBe(true);
  });

  it("matches when repeat_on is a single level string", () => {
    const feature = createFeature({ repeat_on: "2" });
    expect(hasLevel(feature, "2")).toBe(true);
  });

  it("matches when repeat_on is semicolon-separated and includes level", () => {
    const feature = createFeature({ repeat_on: "0;1;2" });
    expect(hasLevel(feature, "1")).toBe(true);
  });

  it("matches when repeat_on is a range (e.g., 1-3) and includes level", () => {
    const feature = createFeature({ repeat_on: "1-3" });
    expect(hasLevel(feature, "2")).toBe(true);
  });

  it("does not match when level is not found", () => {
    const feature = createFeature({ level: "3" });
    expect(hasLevel(feature, "1")).toBe(false);
  });
});

describe("hasCurrentLevel", () => {
  beforeEach(() => {
    (geoMap.getCurrentLevel as jest.Mock).mockReturnValue("2");;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("returns true if feature has current level", () => {
    const feature = createFeature({ level: ["1", "2", "3"] });
    expect(hasCurrentLevel(feature)).toBe(true);
  });

  it("returns false if feature does not have current level", () => {
    const feature = createFeature({ level: ["5"] });
    expect(hasCurrentLevel(feature)).toBe(false);
  });
});

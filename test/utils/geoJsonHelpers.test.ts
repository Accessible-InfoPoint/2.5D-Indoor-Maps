import {
  getRequiredFeatureId,
  getRequiredFeatureProperties,
} from "../../src/utils/geoJsonHelpers";

describe("geoJsonHelpers", () => {
  it("returns feature properties when present", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      id: "way/1",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {
        indoor: "room",
      },
    };

    expect(getRequiredFeatureProperties(feature).indoor).toBe("room");
  });

  it("throws when feature properties are missing", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      id: "way/1",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: null,
    };

    expect(() => getRequiredFeatureProperties(feature)).toThrow(
      "GeoJSON feature is missing properties."
    );
  });

  it("returns feature ids as strings", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      id: 123,
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {},
    };

    expect(getRequiredFeatureId(feature)).toBe("123");
  });

  it("throws when feature id is missing", () => {
    const feature: GeoJSON.Feature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [0, 0],
      },
      properties: {},
    };

    expect(() => getRequiredFeatureId(feature)).toThrow(
      "GeoJSON feature is missing an id."
    );
  });
});

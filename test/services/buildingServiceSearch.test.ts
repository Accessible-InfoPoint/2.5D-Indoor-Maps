jest.mock("maptalks", () => ({}));
jest.mock("../../src/services/backendService", () => ({
  getGeoJson: jest.fn(),
}));
jest.mock("../../src/services/httpService", () => ({ default: {} }));
jest.mock("../../src/services/languageService", () => ({
  lang: { searchSuggestionLevel: "Level " },
}));
jest.mock("bbox-fns", () => ({ booleanContainsPoint: jest.fn() }));
jest.mock("geojson-bounds", () => ({ extent: jest.fn() }));

import BuildingService from "../../src/services/buildingService";
import BackendService from "../../src/services/backendService";

const mockFeatureWithName: GeoJSON.Feature = {
  id: "way/1",
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { name: "Meeting Room", level: [1], indoor: "room" },
};
const mockFeatureWithRef: GeoJSON.Feature = {
  id: "way/2",
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { ref: "B307", level: [0, 1], indoor: "room" },
};
const mockFeatureToilet: GeoJSON.Feature = {
  id: "way/3",
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { amenity: "toilets", level: [2] },
};
const mockFeaturePathway: GeoJSON.Feature = {
  id: "way/4",
  type: "Feature",
  geometry: { type: "LineString", coordinates: [] },
  properties: { indoor: "pathway", level: [1] },
};

describe("BuildingService.searchSuggestions", () => {
  beforeEach(() => {
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [mockFeatureWithName, mockFeatureWithRef, mockFeatureToilet, mockFeaturePathway],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array for empty search string", () => {
    expect(BuildingService.searchSuggestions("")).toEqual([]);
  });

  it("matches by name using substring (case-insensitive)", () => {
    const results = BuildingService.searchSuggestions("meeting");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/1");
    expect(results[0].displayName).toBe("Meeting Room");
    expect(results[0].levels).toEqual([1]);
  });

  it("uses name as displayName when present", () => {
    const results = BuildingService.searchSuggestions("Meeting Room");
    expect(results[0].displayName).toBe("Meeting Room");
  });

  it("matches by ref using startsWith (case-insensitive)", () => {
    const results = BuildingService.searchSuggestions("B3");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/2");
  });

  it("falls back displayName to ref when no name", () => {
    const results = BuildingService.searchSuggestions("B307");
    expect(results[0].displayName).toBe("B307");
  });

  it("returns multi-level array correctly", () => {
    const results = BuildingService.searchSuggestions("B307");
    expect(results[0].levels).toEqual([0, 1]);
  });

  it("matches by amenity using startsWith", () => {
    const results = BuildingService.searchSuggestions("toilet");
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/3");
  });

  it("sets type from amenity when present", () => {
    const results = BuildingService.searchSuggestions("toilet");
    expect(results[0].type).toBe("toilets");
  });

  it("sets type from indoor when no amenity", () => {
    const results = BuildingService.searchSuggestions("B307");
    expect(results[0].type).toBe("room");
  });

  it("type is undefined when neither amenity nor indoor is set", () => {
    const noTypeFeature: GeoJSON.Feature = {
      id: "way/5",
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: { name: "Mystery Space", level: [0] },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [noTypeFeature],
    });
    const results = BuildingService.searchSuggestions("mystery");
    expect(results[0].type).toBeUndefined();
  });

  it("includes the original feature reference in suggestion", () => {
    const results = BuildingService.searchSuggestions("meeting");
    expect(results[0].feature).toBe(mockFeatureWithName);
  });

  it("does not match features by indoor type alone", () => {
    const results = BuildingService.searchSuggestions("pathway");
    expect(results).toHaveLength(0);
  });

  it("returns empty array when no features match", () => {
    const results = BuildingService.searchSuggestions("xyzzy");
    expect(results).toHaveLength(0);
  });
});

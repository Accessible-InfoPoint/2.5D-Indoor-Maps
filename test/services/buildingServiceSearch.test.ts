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

const CTX = { currentLevel: 0 };

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
    expect(BuildingService.searchSuggestions("", CTX)).toEqual([]);
  });

  it("matches by name using substring (case-insensitive)", () => {
    const results = BuildingService.searchSuggestions("meeting", CTX);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/1");
    expect(results[0].displayName).toBe("Meeting Room");
    expect(results[0].levels).toEqual([1]);
  });

  it("uses name as displayName when present", () => {
    const results = BuildingService.searchSuggestions("Meeting Room", CTX);
    expect(results[0].displayName).toBe("Meeting Room");
  });

  it("matches by ref using startsWith (case-insensitive)", () => {
    const results = BuildingService.searchSuggestions("B3", CTX);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/2");
  });

  it("falls back displayName to ref when no name", () => {
    const results = BuildingService.searchSuggestions("B307", CTX);
    expect(results[0].displayName).toBe("B307");
  });

  it("returns multi-level array correctly", () => {
    const results = BuildingService.searchSuggestions("B307", CTX);
    expect(results[0].levels).toEqual([0, 1]);
  });

  it("matches by amenity using startsWith", () => {
    const results = BuildingService.searchSuggestions("toilet", CTX);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/3");
  });

  it("sets type from amenity when present", () => {
    const results = BuildingService.searchSuggestions("toilet", CTX);
    expect(results[0].type).toBe("toilets");
  });

  it("sets type from indoor when no amenity", () => {
    const results = BuildingService.searchSuggestions("B307", CTX);
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
    const results = BuildingService.searchSuggestions("mystery", CTX);
    expect(results[0].type).toBeUndefined();
  });

  it("includes the original feature reference in suggestion", () => {
    const results = BuildingService.searchSuggestions("meeting", CTX);
    expect(results[0].feature).toBe(mockFeatureWithName);
  });

  it("ignores name=yes (OSM artifact) and excludes waste_basket amenity", () => {
    const artifactFeature: GeoJSON.Feature = {
      id: "way/6",
      type: "Feature",
      geometry: { type: "Point", coordinates: [] },
      properties: { name: "yes", amenity: "waste_basket", level: [1] },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [artifactFeature],
    });
    expect(BuildingService.searchSuggestions("yes", CTX)).toHaveLength(0);
    expect(BuildingService.searchSuggestions("waste", CTX)).toHaveLength(0);
  });

  it("does not match features by indoor type alone", () => {
    const results = BuildingService.searchSuggestions("pathway", CTX);
    expect(results).toHaveLength(0);
  });

  it("excludes features with no level property", () => {
    const noLevelFeature: GeoJSON.Feature = {
      id: "way/7",
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: { name: "Lobby", ref: "L1" },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [noLevelFeature],
    });
    expect(BuildingService.searchSuggestions("lobby", CTX)).toHaveLength(0);
  });

  it("excludes features with level as a non-normalized string (Point features)", () => {
    const pointFeature: GeoJSON.Feature = {
      id: "way/8",
      type: "Feature",
      geometry: { type: "Point", coordinates: [] },
      properties: { name: "Shower", amenity: "shower", level: "0" },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [pointFeature],
    });
    expect(BuildingService.searchSuggestions("shower", CTX)).toHaveLength(0);
  });

  it("returns empty array when no features match", () => {
    const results = BuildingService.searchSuggestions("xyzzy", CTX);
    expect(results).toHaveLength(0);
  });

  describe("sort order", () => {
    it("ranks exact displayName match before startsWith before substring", () => {
      const exact: GeoJSON.Feature = {
        id: "way/10", type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room", level: [0] },
      };
      const starts: GeoJSON.Feature = {
        id: "way/11", type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room 101", level: [0] },
      };
      const contains: GeoJSON.Feature = {
        id: "way/12", type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "east room", level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [contains, starts, exact],
      });
      const results = BuildingService.searchSuggestions("room", CTX);
      expect(results.map((r) => r.id)).toEqual(["way/10", "way/11", "way/12"]);
    });

    it("uses level proximity as tiebreaker when match score is equal", () => {
      const level2: GeoJSON.Feature = {
        id: "way/20", type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room A", level: [2] },
      };
      const level0: GeoJSON.Feature = {
        id: "way/21", type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room B", level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [level2, level0],
      });
      const results = BuildingService.searchSuggestions("room", { currentLevel: 0 });
      expect(results[0].id).toBe("way/21");
      expect(results[1].id).toBe("way/20");
    });
  });
});

jest.mock("../../src/services/backendService", () => ({
  getGeoJson: jest.fn(),
  getIndoorModel: jest.fn(),
  getBackendConfig: jest.fn(),
}));
jest.mock("../../src/services/httpService", () => ({ default: {} }));
jest.mock("../../src/services/languageService", () => ({
  lang: { searchSuggestionLevel: "Level " },
}));
jest.mock("bbox-fns", () => ({ booleanContainsPoint: jest.fn() }));
jest.mock("geojson-bounds", () => ({ extent: jest.fn() }));

import BuildingService from "../../src/services/buildingService";
import BackendService from "../../src/services/backendService";
import { IndoorDataPipelineEnum } from "../../src/models/indoorDataPipelineEnum";

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
    (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
      indoorDataPipeline: IndoorDataPipelineEnum.geoJsonCompatibility,
    });
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

  it("returns suggestions from raw indoor model selections", () => {
    (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
      indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
    });
    (BackendService.getIndoorModel as jest.Mock).mockReturnValue({
      rooms: [
        {
          id: "way/100",
          tags: { name: "Raw Meeting Room", level: "0", indoor: "room" },
          levels: [0],
          toGeoJsonFeature: () => ({
            id: "way/100",
            type: "Feature",
            properties: { name: "Raw Meeting Room", level: "0", indoor: "room" },
            geometry: { type: "Polygon", coordinates: [] as GeoJSON.Position[][] },
          }),
        },
      ],
      pointFeatures: [],
      infoPoints: [],
    });

    const results = BuildingService.searchSuggestions("meeting", CTX);

    expect(results.map((result) => result.elementRef)).toEqual([
      expect.objectContaining({
        id: "way/100",
        tags: expect.objectContaining({ name: "Raw Meeting Room" }),
        levels: [0],
      }),
    ]);
    expect(BackendService.getGeoJson).not.toHaveBeenCalled();
  });

  it("resolves selected search context selections in the raw indoor model pipeline", () => {
    (BackendService.getBackendConfig as jest.Mock).mockReturnValue({
      indoorDataPipeline: IndoorDataPipelineEnum.rawIndoorModel,
    });
    (BackendService.getIndoorModel as jest.Mock).mockReturnValue({
      rooms: [
        {
          id: "way/1",
          tags: { name: "Raw Room", level: "0", indoor: "room" },
          levels: [0],
          toGeoJsonFeature: () => ({
            id: "way/1",
            type: "Feature",
            properties: { name: "Raw Room", level: "0", indoor: "room" },
            geometry: { type: "Polygon", coordinates: [] as GeoJSON.Position[][] },
          }),
        },
      ],
      pointFeatures: [],
      infoPoints: [],
    });

    expect(BuildingService.getSearchSuggestionFeatureById("way/1")).toBeUndefined();
    expect(BuildingService.getSearchElementRefById("way/1")).toEqual(
      expect.objectContaining({ id: "way/1", levels: [0] }),
    );
    expect(BackendService.getGeoJson).not.toHaveBeenCalled();
  });

  it("resolves selected search context selections from GeoJSON in compatibility pipelines", () => {
    expect(BuildingService.getSearchSuggestionFeatureById("way/1")).toBe(mockFeatureWithName);
    expect(BuildingService.getSearchElementRefById("way/1")).toEqual(
      expect.objectContaining({
        id: "way/1",
        tags: mockFeatureWithName.properties,
        levels: [1],
        geometry: mockFeatureWithName.geometry,
      }),
    );
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

  it("parses string levels on point features", () => {
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
    const results = BuildingService.searchSuggestions("shower", CTX);
    expect(results).toHaveLength(1);
    expect(results[0].levels).toEqual([0]);
  });

  it("includes repeat_on levels in suggestion levels", () => {
    const repeatedFeature: GeoJSON.Feature = {
      id: "way/9",
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [] },
      properties: { name: "Repeated Room", level: "0", repeat_on: "1-2" },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [repeatedFeature],
    });
    const results = BuildingService.searchSuggestions("repeated", CTX);
    expect(results).toHaveLength(1);
    expect(results[0].levels).toEqual([0, 1, 2]);
  });

  it("returns empty array when no features match", () => {
    const results = BuildingService.searchSuggestions("xyzzy", CTX);
    expect(results).toHaveLength(0);
  });

  describe("sort order", () => {
    it("ranks exact displayName match before startsWith before substring", () => {
      const exact: GeoJSON.Feature = {
        id: "way/10",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room", level: [0] },
      };
      const starts: GeoJSON.Feature = {
        id: "way/11",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room 101", level: [0] },
      };
      const contains: GeoJSON.Feature = {
        id: "way/12",
        type: "Feature",
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

    it("ranks closer level before farther level when match score is equal", () => {
      const level2: GeoJSON.Feature = {
        id: "way/20",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room A", level: [2] },
      };
      const level0: GeoJSON.Feature = {
        id: "way/21",
        type: "Feature",
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

    it("uses repeat_on levels when ranking by level distance", () => {
      const repeatedOn2: GeoJSON.Feature = {
        id: "way/22",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room repeated", level: "0", repeat_on: "2" },
      };
      const level0: GeoJSON.Feature = {
        id: "way/23",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "room base", level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [level0, repeatedOn2],
      });
      const results = BuildingService.searchSuggestions("room", { currentLevel: 2 });
      expect(results[0].id).toBe("way/22");
      expect(results[1].id).toBe("way/23");
    });

    it("ranks closer to selected feature before farther when match and level are equal", () => {
      const near: GeoJSON.Feature = {
        id: "way/30",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { name: "room C", level: [0] },
      };
      const far: GeoJSON.Feature = {
        id: "way/31",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1.01, 1],
              [1.01, 1.01],
              [1, 1.01],
              [1, 1],
            ],
          ],
        },
        properties: { name: "room D", level: [0] },
      };
      const selected: GeoJSON.Feature = {
        id: "way/99",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [far, near],
      });
      const results = BuildingService.searchSuggestions("room", {
        currentLevel: 0,
        selectedFeature: selected,
      });
      expect(results[0].id).toBe("way/30");
      expect(results[1].id).toBe("way/31");
    });

    it("ranks closer to info point before farther when match, level, and selected feature are equal", () => {
      const near: GeoJSON.Feature = {
        id: "way/60",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { name: "room E", level: [0] },
      };
      const far: GeoJSON.Feature = {
        id: "way/61",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1.01, 1],
              [1.01, 1.01],
              [1, 1.01],
              [1, 1],
            ],
          ],
        },
        properties: { name: "room F", level: [0] },
      };
      const infoPoint: GeoJSON.Feature = {
        id: "way/98",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [far, near],
      });
      const results = BuildingService.searchSuggestions("room", {
        currentLevel: 0,
        infoPointFeature: infoPoint,
      });
      expect(results[0].id).toBe("way/60");
      expect(results[1].id).toBe("way/61");
    });

    it("uses point info features when ranking by proximity", () => {
      const near: GeoJSON.Feature = {
        id: "way/62",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { name: "room G", level: [0] },
      };
      const far: GeoJSON.Feature = {
        id: "way/63",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [1, 1],
              [1.01, 1],
              [1.01, 1.01],
              [1, 1.01],
              [1, 1],
            ],
          ],
        },
        properties: { name: "room H", level: [0] },
      };
      const infoPoint: GeoJSON.Feature = {
        id: "node/98",
        type: "Feature",
        geometry: { type: "Point", coordinates: [0, 0] },
        properties: { level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [far, near],
      });
      const results = BuildingService.searchSuggestions("room", {
        currentLevel: 0,
        infoPointFeature: infoPoint,
      });
      expect(results[0].id).toBe("way/62");
      expect(results[1].id).toBe("way/63");
    });

    it("ranks a higher-priority field before a lower-priority field at equal match quality", () => {
      const refPrefixMatch: GeoJSON.Feature = {
        id: "way/50",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { ref: "toiletA", level: [0] },
      };
      const amenityPrefixMatch: GeoJSON.Feature = {
        id: "way/51",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { amenity: "toilets", level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [amenityPrefixMatch, refPrefixMatch],
      });
      const results = BuildingService.searchSuggestions("toilet", CTX);
      expect(results.map((r) => r.id)).toEqual(["way/50", "way/51"]);
    });

    it("scores a feature by its best-matching field, not just its displayName", () => {
      const exactRefWithName: GeoJSON.Feature = {
        id: "way/52",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "Lecture Hall", ref: "z12", level: [0] },
      };
      const substringNameMatch: GeoJSON.Feature = {
        id: "way/53",
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { name: "Room Z12 Wing", level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [exactRefWithName, substringNameMatch],
      });
      const results = BuildingService.searchSuggestions("z12", CTX);
      // an exact ref match ranks close behind (not unpredictably below) a substring
      // name match, even though this feature also has an unrelated name property
      expect(results.map((r) => r.id)).toEqual(["way/53", "way/52"]);
    });

    it("ranks wheelchair-accessible rooms first in wheelchair mode, even if farther away", () => {
      const accessibleFar: GeoJSON.Feature = {
        id: "way/40",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [5, 5],
              [5.01, 5],
              [5.01, 5.01],
              [5, 5.01],
              [5, 5],
            ],
          ],
        },
        properties: { amenity: "toilets", wheelchair: "yes", level: [0] },
      };
      const nearNonAccessible: GeoJSON.Feature = {
        id: "way/41",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { amenity: "toilets", level: [0] },
      };
      const selected: GeoJSON.Feature = {
        id: "way/99",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [nearNonAccessible, accessibleFar],
      });
      const results = BuildingService.searchSuggestions("toilet", {
        currentLevel: 0,
        selectedFeature: selected,
        wheelchairMode: true,
      });
      expect(results[0].id).toBe("way/40");
      expect(results[1].id).toBe("way/41");
    });

    it("ranks the closer room first when wheelchair mode is off", () => {
      const accessibleFar: GeoJSON.Feature = {
        id: "way/40",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [5, 5],
              [5.01, 5],
              [5.01, 5.01],
              [5, 5.01],
              [5, 5],
            ],
          ],
        },
        properties: { amenity: "toilets", wheelchair: "yes", level: [0] },
      };
      const nearNonAccessible: GeoJSON.Feature = {
        id: "way/41",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { amenity: "toilets", level: [0] },
      };
      const selected: GeoJSON.Feature = {
        id: "way/99",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
        properties: { level: [0] },
      };
      (BackendService.getGeoJson as jest.Mock).mockReturnValue({
        type: "FeatureCollection",
        features: [accessibleFar, nearNonAccessible],
      });
      const results = BuildingService.searchSuggestions("toilet", {
        currentLevel: 0,
        selectedFeature: selected,
      });
      expect(results[0].id).toBe("way/41");
      expect(results[1].id).toBe("way/40");
    });
  });

  it("logs sorted ranking details when search suggestion debug mode is enabled", () => {
    const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    const debugSpy = jest.spyOn(console, "debug").mockImplementation();
    const tableSpy = jest.spyOn(console, "table").mockImplementation();

    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: jest.fn((key: string) => (key === "debugSearchSuggestions" ? "true" : null)),
      },
    });

    const near: GeoJSON.Feature = {
      id: "way/70",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0.01, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0, 0],
          ],
        ],
      },
      properties: { name: "room debug near", level: [0] },
    };
    const far: GeoJSON.Feature = {
      id: "way/71",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [1, 1],
            [1.01, 1],
            [1.01, 1.01],
            [1, 1.01],
            [1, 1],
          ],
        ],
      },
      properties: { name: "room debug far", level: [1], wheelchair: "yes" },
    };
    const selected: GeoJSON.Feature = {
      id: "way/72",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [0.01, 0],
            [0.01, 0.01],
            [0, 0.01],
            [0, 0],
          ],
        ],
      },
      properties: { level: [0] },
    };
    (BackendService.getGeoJson as jest.Mock).mockReturnValue({
      type: "FeatureCollection",
      features: [far, near],
    });

    try {
      BuildingService.searchSuggestions("room", {
        currentLevel: 0,
        selectedFeature: selected,
        infoPointFeature: selected,
        wheelchairMode: true,
      });

      expect(debugSpy).toHaveBeenCalledWith(
        "[SearchSuggestions] ranking context",
        expect.objectContaining({
          query: "room",
          sortOrder: [
            "matchScore",
            "wheelchairScore",
            "levelDistance",
            "selectedDistanceSq",
            "infoDistanceSq",
          ],
        }),
      );
      expect(tableSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          rank: 1,
          id: "way/71",
          matchScore: 1,
          wheelchairScore: 0,
          wheelchairAccessible: true,
          levelDistance: 1,
        }),
        expect.objectContaining({
          rank: 2,
          id: "way/70",
          matchScore: 1,
          wheelchairScore: 1,
          wheelchairAccessible: false,
          levelDistance: 0,
        }),
      ]);
    } finally {
      debugSpy.mockRestore();
      tableSpy.mockRestore();
      if (originalLocalStorage) {
        Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
      } else {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      }
    }
  });
});

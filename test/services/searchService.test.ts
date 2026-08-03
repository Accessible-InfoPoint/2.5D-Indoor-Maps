jest.mock("../../src/services/backendService", () => ({
  getIndoorModel: jest.fn(),
}));
jest.mock("../../src/services/httpService", () => ({ default: {} }));
jest.mock("../../src/services/languageService", () => ({
  lang: { searchSuggestionLevel: "Level " },
}));

import SearchService from "../../src/services/searchService";
import BackendService from "../../src/services/backendService";
import { createIndoorElementRef } from "@indoortoolkit/indoor-osm-parser";

const CTX = { currentLevel: 0 };

describe("SearchService.searchSuggestions", () => {
  beforeEach(() => {
    setSearchableElements([
      roomElement("way/1", { name: "Meeting Room", level: "1", indoor: "room" }, [1]),
      roomElement("way/2", { ref: "B307", level: "0;1", indoor: "room" }, [0, 1]),
      roomElement("way/3", { amenity: "toilets", level: "2" }, [2]),
      roomElement("way/4", { indoor: "pathway", level: "1" }, [1]),
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty array for empty search string", () => {
    expect(SearchService.searchSuggestions("", CTX)).toEqual([]);
  });

  it("returns suggestions from raw indoor model selections", () => {
    setSearchableElements([
      roomElement("way/100", { name: "Raw Meeting Room", level: "0", indoor: "room" }, [0]),
    ]);

    const results = SearchService.searchSuggestions("meeting", CTX);

    expect(results.map((result) => result.elementRef)).toEqual([
      expect.objectContaining({
        id: "way/100",
        tags: expect.objectContaining({ name: "Raw Meeting Room" }),
        levels: [0],
      }),
    ]);
  });

  it("resolves selected search context selections in the raw indoor model pipeline", () => {
    setSearchableElements([
      roomElement("way/1", { name: "Raw Room", level: "0", indoor: "room" }, [0]),
    ]);

    expect(SearchService.getSearchElementRefById("way/1")).toEqual(
      expect.objectContaining({ id: "way/1", levels: [0] }),
    );
  });

  it("matches by name using substring and uses name as displayName", () => {
    const results = SearchService.searchSuggestions("meeting", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/1");
    expect(results[0].displayName).toBe("Meeting Room");
    expect(results[0].levels).toEqual([1]);
  });

  it("matches by ref and falls back displayName to ref", () => {
    const results = SearchService.searchSuggestions("B3", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/2");
    expect(results[0].displayName).toBe("B307");
    expect(results[0].levels).toEqual([0, 1]);
    expect(results[0].type).toBe("room");
  });

  it("matches by amenity and sets type from amenity", () => {
    const results = SearchService.searchSuggestions("toilet", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/3");
    expect(results[0].type).toBe("toilets");
  });

  it("matches by room tag and uses room as fallback display type", () => {
    setSearchableElements([
      roomElement("way/5", { indoor: "room", room: "classroom", level: "0" }, [0]),
    ]);

    const results = SearchService.searchSuggestions("classroom", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/5");
    expect(results[0].displayName).toBe("classroom");
    expect(results[0].type).toBe("classroom");
  });

  it("matches configured room tag aliases", () => {
    setSearchableElements([
      roomElement("way/6", { indoor: "room", room: "classroom", level: "0" }, [0]),
    ]);

    const results = SearchService.searchSuggestions("seminar", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("way/6");
  });

  it("matches configured German room tag aliases", () => {
    setSearchableElements([
      roomElement("way/7", { indoor: "room", room: "lecture", level: "0" }, [0]),
      roomElement("way/8", { indoor: "room", room: "office", level: "0" }, [0]),
    ]);

    expect(SearchService.searchSuggestions("hörsaal", CTX).map((result) => result.id)).toEqual([
      "way/7",
    ]);
    expect(SearchService.searchSuggestions("büro", CTX).map((result) => result.id)).toEqual([
      "way/8",
    ]);
  });

  it("matches configured amenity tag aliases", () => {
    setSearchableElements([
      pointElement("node/9", { amenity: "atm", level: "0" }, [0]),
      pointElement("node/10", { amenity: "post_office", level: "0" }, [0]),
      pointElement("node/11", { amenity: "toilets", level: "0" }, [0]),
    ]);

    expect(SearchService.searchSuggestions("geldautomat", CTX).map((result) => result.id)).toEqual([
      "node/9",
    ]);
    expect(SearchService.searchSuggestions("postfiliale", CTX).map((result) => result.id)).toEqual([
      "node/10",
    ]);
    expect(SearchService.searchSuggestions("wc", CTX).map((result) => result.id)).toEqual([
      "node/11",
    ]);
  });

  it("type is undefined when neither amenity nor indoor is set", () => {
    setSearchableElements([roomElement("way/5", { name: "Mystery Space", level: "0" }, [0])]);

    const results = SearchService.searchSuggestions("mystery", CTX);

    expect(results[0].type).toBeUndefined();
  });

  it("ignores name=yes, excludes waste_basket amenity, and requires levels", () => {
    setSearchableElements([
      pointElement("node/6", { name: "yes", amenity: "waste_basket", level: "1" }, [1]),
      roomElement("way/7", { name: "Lobby", ref: "L1" }, []),
    ]);

    expect(SearchService.searchSuggestions("yes", CTX)).toHaveLength(0);
    expect(SearchService.searchSuggestions("waste", CTX)).toHaveLength(0);
    expect(SearchService.searchSuggestions("lobby", CTX)).toHaveLength(0);
  });

  it("does not match elements by indoor type alone", () => {
    const results = SearchService.searchSuggestions("pathway", CTX);

    expect(results).toHaveLength(0);
  });

  it("includes repeat_on levels in suggestion levels", () => {
    setSearchableElements([
      roomElement("way/9", { name: "Repeated Room", level: "0", repeat_on: "1-2" }, [0, 1, 2]),
    ]);

    const results = SearchService.searchSuggestions("repeated", CTX);

    expect(results).toHaveLength(1);
    expect(results[0].levels).toEqual([0, 1, 2]);
  });

  it("returns empty array when no elements match", () => {
    expect(SearchService.searchSuggestions("xyzzy", CTX)).toHaveLength(0);
  });

  describe("sort order", () => {
    it("ranks exact displayName match before startsWith before substring", () => {
      setSearchableElements([
        roomElement("way/12", { name: "east room", level: "0" }, [0]),
        roomElement("way/11", { name: "room 101", level: "0" }, [0]),
        roomElement("way/10", { name: "room", level: "0" }, [0]),
      ]);

      const results = SearchService.searchSuggestions("room", CTX);

      expect(results.map((result) => result.id)).toEqual(["way/10", "way/11", "way/12"]);
    });

    it("ranks closer level before farther level when match score is equal", () => {
      setSearchableElements([
        roomElement("way/20", { name: "room A", level: "2" }, [2]),
        roomElement("way/21", { name: "room B", level: "0" }, [0]),
      ]);

      const results = SearchService.searchSuggestions("room", { currentLevel: 0 });

      expect(results.map((result) => result.id)).toEqual(["way/21", "way/20"]);
    });

    it("uses repeat_on levels when ranking by level distance", () => {
      setSearchableElements([
        roomElement("way/23", { name: "room base", level: "0" }, [0]),
        roomElement("way/22", { name: "room repeated", level: "0", repeat_on: "2" }, [0, 2]),
      ]);

      const results = SearchService.searchSuggestions("room", { currentLevel: 2 });

      expect(results.map((result) => result.id)).toEqual(["way/22", "way/23"]);
    });

    it("ranks closer to selected element before farther when match and level are equal", () => {
      setSearchableElements([
        roomElement("way/31", { name: "room D", level: "0" }, [0], polygonAt(1, 1)),
        roomElement("way/30", { name: "room C", level: "0" }, [0], polygonAt(0, 0)),
      ]);

      const results = SearchService.searchSuggestions("room", {
        currentLevel: 0,
        selectedElementRef: elementRef("way/99", { level: "0" }, [0], polygonAt(0, 0)),
      });

      expect(results.map((result) => result.id)).toEqual(["way/30", "way/31"]);
    });

    it("uses point info elements when ranking by proximity", () => {
      setSearchableElements([
        roomElement("way/63", { name: "room H", level: "0" }, [0], polygonAt(1, 1)),
        roomElement("way/62", { name: "room G", level: "0" }, [0], polygonAt(0, 0)),
      ]);

      const results = SearchService.searchSuggestions("room", {
        currentLevel: 0,
        infoPointElementRef: elementRef("node/98", { level: "0" }, [0], {
          type: "Point",
          coordinates: [0, 0],
        }),
      });

      expect(results.map((result) => result.id)).toEqual(["way/62", "way/63"]);
    });

    it("ranks a higher-priority field before a lower-priority field at equal match quality", () => {
      setSearchableElements([
        roomElement("way/51", { amenity: "toilets", level: "0" }, [0]),
        roomElement("way/50", { ref: "toiletA", level: "0" }, [0]),
      ]);

      const results = SearchService.searchSuggestions("toilet", CTX);

      expect(results.map((result) => result.id)).toEqual(["way/50", "way/51"]);
    });

    it("scores an element by its best-matching field, not just its displayName", () => {
      setSearchableElements([
        roomElement("way/52", { name: "Lecture Hall", ref: "z12", level: "0" }, [0]),
        roomElement("way/53", { name: "Room Z12 Wing", level: "0" }, [0]),
      ]);

      const results = SearchService.searchSuggestions("z12", CTX);

      expect(results.map((result) => result.id)).toEqual(["way/53", "way/52"]);
    });

    it("ranks wheelchair-accessible rooms first in wheelchair mode, even if farther away", () => {
      setSearchableElements([
        roomElement("way/41", { amenity: "toilets", level: "0" }, [0], polygonAt(0, 0)),
        roomElement(
          "way/40",
          { amenity: "toilets", wheelchair: "yes", level: "0" },
          [0],
          polygonAt(5, 5),
        ),
      ]);

      const results = SearchService.searchSuggestions("toilet", {
        currentLevel: 0,
        selectedElementRef: elementRef("way/99", { level: "0" }, [0], polygonAt(0, 0)),
        wheelchairMode: true,
      });

      expect(results.map((result) => result.id)).toEqual(["way/40", "way/41"]);
    });

    it("ranks the closer room first when wheelchair mode is off", () => {
      setSearchableElements([
        roomElement(
          "way/40",
          { amenity: "toilets", wheelchair: "yes", level: "0" },
          [0],
          polygonAt(5, 5),
        ),
        roomElement("way/41", { amenity: "toilets", level: "0" }, [0], polygonAt(0, 0)),
      ]);

      const results = SearchService.searchSuggestions("toilet", {
        currentLevel: 0,
        selectedElementRef: elementRef("way/99", { level: "0" }, [0], polygonAt(0, 0)),
      });

      expect(results.map((result) => result.id)).toEqual(["way/41", "way/40"]);
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

    setSearchableElements([
      roomElement("way/71", { name: "room debug far", level: "1", wheelchair: "yes" }, [1]),
      roomElement("way/70", { name: "room debug near", level: "0" }, [0]),
    ]);

    try {
      SearchService.searchSuggestions("room", {
        currentLevel: 0,
        selectedElementRef: elementRef("way/72", { level: "0" }, [0], polygonAt(0, 0)),
        infoPointElementRef: elementRef("way/72", { level: "0" }, [0], polygonAt(0, 0)),
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

interface SearchableElementStub {
  id: string;
  tags: Record<string, string>;
  levels: number[];
  geometry: GeoJSON.Geometry;
}

function setSearchableElements(elements: SearchableElementStub[]): void {
  (BackendService.getIndoorModel as jest.Mock).mockReturnValue({
    elements: {
      rooms: elements.filter((element) => !element.id.startsWith("node/")),
      pointFeatures: elements.filter((element) => element.id.startsWith("node/")),
    },
  });
}

function roomElement(
  id: string,
  tags: Record<string, string>,
  levels: number[],
  geometry: GeoJSON.Geometry = { type: "Polygon", coordinates: [] },
): SearchableElementStub {
  return element(id, tags, levels, geometry);
}

function pointElement(
  id: string,
  tags: Record<string, string>,
  levels: number[],
  geometry: GeoJSON.Geometry = { type: "Point", coordinates: [] },
): SearchableElementStub {
  return element(id, tags, levels, geometry);
}

function element(
  id: string,
  tags: Record<string, string>,
  levels: number[],
  geometry: GeoJSON.Geometry,
): SearchableElementStub {
  return {
    id,
    tags,
    levels,
    geometry,
  };
}

function elementRef(
  id: string,
  tags: Record<string, string>,
  levels: number[],
  geometry: GeoJSON.Geometry,
) {
  return createIndoorElementRef({ id, tags, levels, geometry });
}

function polygonAt(x: number, y: number): GeoJSON.Polygon {
  return {
    type: "Polygon",
    coordinates: [
      [
        [x, y],
        [x + 0.01, y],
        [x + 0.01, y + 0.01],
        [x, y + 0.01],
        [x, y],
      ],
    ],
  };
}

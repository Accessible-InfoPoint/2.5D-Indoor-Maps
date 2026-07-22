import {
  filterByBounds,
  filterByBoundsOrBearingNode,
  filterFeaturesByIndoorSearch,
  filterInsideAndLevel,
  findBuildingBySearchString,
  findFeatureById,
} from "../../src/utils/buildingGeoJsonFilters";

describe("buildingGeoJsonFilters", () => {
  describe("findBuildingBySearchString", () => {
    it("finds buildings by name or loc_ref", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          polygonFeature(
            "relation/1",
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
            { building: "yes", name: "Library" },
          ),
          polygonFeature(
            "relation/2",
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 2],
            ],
            { building: "yes", loc_ref: "APB" },
          ),
        ],
      };

      expect(findBuildingBySearchString(collection, "Library")?.id).toBe("relation/1");
      expect(findBuildingBySearchString(collection, "APB")?.id).toBe("relation/2");
    });

    it("ignores matching non-building features", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          polygonFeature(
            "relation/1",
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 0],
            ],
            { name: "Library" },
          ),
        ],
      };

      expect(findBuildingBySearchString(collection, "Library")).toBeUndefined();
    });
  });

  describe("findFeatureById", () => {
    it("finds features by normalized GeoJSON id", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [pointFeature(1, [0, 0], { level: "0" })],
      };

      expect(findFeatureById(collection, "1")?.id).toBe(1);
    });
  });

  describe("filterFeaturesByIndoorSearch", () => {
    it("matches room refs, indoor types, and amenities case-insensitively by prefix", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          pointFeature("room", [0, 0], { ref: "A101" }),
          pointFeature("corridor", [0, 0], { indoor: "Corridor" }),
          pointFeature("toilet", [0, 0], { amenity: "toilets" }),
          pointFeature("miss", [0, 0], { ref: "B101" }),
        ],
      };

      expect(filterFeaturesByIndoorSearch(collection, "a").map((feature) => feature.id)).toEqual([
        "room",
      ]);
      expect(filterFeaturesByIndoorSearch(collection, "cor").map((feature) => feature.id)).toEqual([
        "corridor",
      ]);
      expect(filterFeaturesByIndoorSearch(collection, "TOI").map((feature) => feature.id)).toEqual([
        "toilet",
      ]);
    });
  });

  describe("filterByBounds", () => {
    it("keeps leveled point, line, and polygon features that intersect the bounding box", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          pointFeature("inside-point", [0.5, 0.5], { level: "0" }),
          lineFeature(
            "inside-line",
            [
              [2, 2],
              [0.5, 0.5],
            ],
            { level: "0" },
          ),
          polygonFeature(
            "inside-polygon",
            [
              [2, 2],
              [0.25, 0.25],
              [2, 0.25],
              [2, 2],
            ],
            { level: "0" },
          ),
          pointFeature("outside", [2, 2], { level: "0" }),
          pointFeature("missing-level", [0.5, 0.5], {}),
        ],
      };

      const result = filterByBounds(collection, [0, 0, 1, 1]);

      expect(result.features.map((feature) => feature.id)).toEqual([
        "inside-point",
        "inside-line",
        "inside-polygon",
      ]);
    });

    it("keeps configured bearing nodes even when they are outside the bounding box", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          pointFeature("node/1", [0.5, 0.5], { level: "0" }),
          pointFeature("node/2", [20, 20], {}),
          pointFeature("node/3", [30, 30], {}),
        ],
      };

      const result = filterByBoundsOrBearingNode(collection, [0, 0, 1, 1], {
        bearingNodeIds: [2],
      });

      expect(result.features.map((feature) => feature.id)).toEqual(["node/1", "node/2"]);
    });
  });

  describe("filterInsideAndLevel", () => {
    it("keeps indoor features unless indoor is no and keeps any leveled feature", () => {
      const collection: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          pointFeature("indoor-room", [0, 0], { indoor: "room" }),
          pointFeature("leveled-outdoor", [0, 0], { indoor: "no", level: "0" }),
          pointFeature("outdoor", [0, 0], { indoor: "no" }),
          pointFeature("unrelated", [0, 0], {}),
        ],
      };

      expect(filterInsideAndLevel(collection).features.map((feature) => feature.id)).toEqual([
        "indoor-room",
        "leveled-outdoor",
      ]);
    });
  });
});

function pointFeature(
  id: string | number,
  coordinates: GeoJSON.Position,
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: "Feature",
    id,
    properties,
    geometry: {
      type: "Point",
      coordinates,
    },
  };
}

function lineFeature(
  id: string,
  coordinates: GeoJSON.Position[],
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    id,
    properties,
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function polygonFeature(
  id: string,
  coordinates: GeoJSON.Position[],
  properties: GeoJSON.GeoJsonProperties,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    id,
    properties,
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

import { findBuildingInOverpassBySearchString } from "../../src/utils/buildingOverpassFilters";
import { OverpassJson } from "../../src/models/overpassJson";

describe("buildingOverpassFilters", () => {
  it("finds a building way by name", () => {
    const result = findBuildingInOverpassBySearchString(buildings, "Fixture Building");

    expect(result).toEqual({
      id: "way/10",
      tags: {
        building: "university",
        name: "Fixture Building",
      },
      boundingBox: [0, 0, 10, 10],
      outlineGeometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
      },
    });
  });

  it("finds a building relation by loc_ref and builds the outline from outer ways", () => {
    const result = findBuildingInOverpassBySearchString(buildings, "REL");

    expect(result?.id).toBe("relation/30");
    expect(result?.boundingBox).toEqual([20, 20, 30, 30]);
    expect(result?.outlineGeometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [20, 20],
          [30, 20],
          [30, 30],
          [20, 30],
          [20, 20],
        ],
      ],
    });
  });

  it("ignores matching elements without building tags", () => {
    expect(findBuildingInOverpassBySearchString(buildings, "Not A Building")).toBeUndefined();
  });
});

const buildings: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 10 },
    { type: "node", id: 3, lat: 10, lon: 10 },
    { type: "node", id: 4, lat: 10, lon: 0 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 4, 1],
      tags: {
        building: "university",
        name: "Fixture Building",
      },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 2, 3, 4, 1],
      tags: {
        name: "Not A Building",
      },
    },
    { type: "node", id: 21, lat: 20, lon: 20 },
    { type: "node", id: 22, lat: 20, lon: 30 },
    { type: "node", id: 23, lat: 30, lon: 30 },
    { type: "node", id: 24, lat: 30, lon: 20 },
    { type: "way", id: 21, nodes: [21, 22] },
    { type: "way", id: 22, nodes: [22, 23, 24, 21] },
    {
      type: "relation",
      id: 30,
      members: [
        { type: "way", ref: 21, role: "outer" },
        { type: "way", ref: 22, role: "outer" },
      ],
      tags: {
        type: "multipolygon",
        building: "yes",
        loc_ref: "REL",
      },
    },
  ],
};

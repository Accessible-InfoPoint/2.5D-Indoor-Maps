import { IndoorWall, OsmGraph, OverpassJson } from "../../src/indoor";

describe("IndoorWall", () => {
  it("collects raw wall ways from the graph", () => {
    const graph = new OsmGraph(wallFixture);

    expect(IndoorWall.collectFromGraph(graph).map((wall) => wall.id)).toEqual(["way/10", "way/12"]);
  });

  it("creates line geometry from a wall way", () => {
    const graph = new OsmGraph(wallFixture);
    const wall = IndoorWall.collectFromGraph(graph)[0];

    expect(wall.id).toBe("way/10");
    expect(wall.tags).toEqual({ indoor: "wall", level: "0" });
    expect(wall.geometry).toEqual({
      type: "LineString",
      coordinates: [
        [13, 51],
        [13.1, 51],
      ],
    });
  });

  it("creates polygon geometry from an area wall way", () => {
    const graph = new OsmGraph(wallFixture);
    const areaWall = IndoorWall.collectFromGraph(graph)[1];

    expect(areaWall.isAreaWall).toBe(true);
    expect(areaWall.id).toBe("way/12");
    expect(areaWall.tags).toEqual({ indoor: "wall", area: "yes", level: "0" });
    expect(areaWall.geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [13, 51],
          [13.1, 51],
          [13.1, 51.1],
          [13, 51],
        ],
      ],
    });
  });
});

const wallFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.1 },
    { type: "node", id: 3, lat: 51.1, lon: 13.1 },
    { type: "way", id: 10, nodes: [1, 2], tags: { indoor: "wall", level: "0" } },
    { type: "way", id: 11, nodes: [1, 2], tags: { indoor: "room", level: "0" } },
    { type: "way", id: 12, nodes: [1, 2, 3], tags: { indoor: "wall", area: "yes", level: "0" } },
  ],
};

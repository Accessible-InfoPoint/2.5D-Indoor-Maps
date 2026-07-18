import { IndoorWall } from "../../src/indoor/elements/IndoorWall";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorWall", () => {
  it("collects raw wall ways from the graph", () => {
    const graph = new OsmGraph(wallFixture);

    expect(IndoorWall.collectFromGraph(graph).map((wall) => wall.id)).toEqual(["way/10", "way/12"]);
  });

  it("creates a line feature from a wall way", () => {
    const graph = new OsmGraph(wallFixture);
    const wall = IndoorWall.collectFromGraph(graph)[0];

    expect(wall.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "way/10",
      properties: { indoor: "wall", level: "0" },
      geometry: {
        type: "LineString",
        coordinates: [
          [13, 51],
          [13.1, 51],
        ],
      },
    });
  });

  it("creates a polygon feature from an area wall way", () => {
    const graph = new OsmGraph(wallFixture);
    const areaWall = IndoorWall.collectFromGraph(graph)[1];

    expect(areaWall.isAreaWall).toBe(true);
    expect(areaWall.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "way/12",
      properties: { indoor: "wall", area: "yes", level: "0" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [13, 51],
            [13.1, 51],
            [13.1, 51.1],
            [13, 51],
          ],
        ],
      },
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

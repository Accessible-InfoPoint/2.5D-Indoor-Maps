import { IndoorInfoPoint, OsmGraph, OverpassJson } from "../../src/indoor";

describe("IndoorInfoPoint", () => {
  it("collects tactile map information nodes from the graph", () => {
    const graph = new OsmGraph(infoPointFixture);

    expect(IndoorInfoPoint.collectFromGraph(graph).map((infoPoint) => infoPoint.id)).toEqual([
      "node/10",
    ]);
  });

  it("creates point geometry from an information node", () => {
    const graph = new OsmGraph(infoPointFixture);
    const infoPoint = IndoorInfoPoint.collectFromGraph(graph)[0];

    expect(infoPoint.id).toBe("node/10");
    expect(infoPoint.tags).toEqual({ information: "tactile_map", level: "0" });
    expect(infoPoint.geometry).toEqual({
      type: "Point",
      coordinates: [13, 51],
    });
  });
});

const infoPointFixture: OverpassJson = {
  elements: [
    { type: "node", id: 10, lat: 51, lon: 13, tags: { information: "tactile_map", level: "0" } },
    { type: "node", id: 11, lat: 51, lon: 13.1, tags: { information: "board", level: "0" } },
    {
      type: "way",
      id: 12,
      nodes: [10, 11],
      tags: { information: "tactile_map", level: "0" },
    },
  ],
};

import { IndoorInfoPoint } from "../../src/indoor/elements/IndoorInfoPoint";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorInfoPoint", () => {
  it("collects tactile map information nodes from the graph", () => {
    const graph = new OsmGraph(infoPointFixture);

    expect(IndoorInfoPoint.collectFromGraph(graph).map((infoPoint) => infoPoint.id)).toEqual([
      "node/10",
    ]);
  });

  it("creates a point feature from an information node", () => {
    const graph = new OsmGraph(infoPointFixture);
    const infoPoint = IndoorInfoPoint.collectFromGraph(graph)[0];

    expect(infoPoint.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "node/10",
      properties: { information: "tactile_map", level: "0" },
      geometry: {
        type: "Point",
        coordinates: [13, 51],
      },
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

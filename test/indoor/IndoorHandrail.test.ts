import { IndoorHandrail } from "../../src/indoor/elements/IndoorHandrail";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorHandrail", () => {
  it("collects raw barrier=handrail ways from the graph", () => {
    const graph = new OsmGraph(handrailFixture);

    expect(IndoorHandrail.collectFromGraph(graph).map((handrail) => handrail.id)).toEqual([
      "way/10",
    ]);
  });

  it("creates a line feature from a handrail way", () => {
    const graph = new OsmGraph(handrailFixture);
    const handrail = IndoorHandrail.collectFromGraph(graph)[0];

    expect(handrail.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "way/10",
      properties: { barrier: "handrail", level: "0" },
      geometry: {
        type: "LineString",
        coordinates: [
          [13, 51],
          [13.1, 51],
        ],
      },
    });
  });

  it("detects shared landing edges by node ids", () => {
    const graph = new OsmGraph(handrailFixture);
    const handrail = IndoorHandrail.collectFromGraph(graph)[0];

    expect(handrail.sharesAtLeastTwoNodes([1, 2, 3])).toBe(true);
    expect(handrail.sharesAtLeastTwoNodes([2, 3])).toBe(false);
  });
});

const handrailFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.1 },
    { type: "node", id: 3, lat: 51.1, lon: 13.1 },
    { type: "way", id: 10, nodes: [1, 2], tags: { barrier: "handrail", level: "0" } },
    { type: "way", id: 11, nodes: [1, 2], tags: { indoor: "wall", level: "0" } },
  ],
};

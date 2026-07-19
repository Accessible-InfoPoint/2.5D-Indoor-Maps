import { IndoorTactilePaving } from "../../src/indoor/elements/IndoorTactilePaving";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorTactilePaving", () => {
  it("collects tactile paving ways from the graph", () => {
    const graph = new OsmGraph(tactilePavingFixture);

    expect(IndoorTactilePaving.collectFromGraph(graph).map((paving) => paving.id)).toEqual([
      "way/10",
    ]);
  });

  it("creates a line feature from a tactile paving way", () => {
    const graph = new OsmGraph(tactilePavingFixture);
    const tactilePaving = IndoorTactilePaving.collectFromGraph(graph)[0];

    expect(tactilePaving.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "way/10",
      properties: { tactile_paving: "yes", level: "0" },
      geometry: {
        type: "LineString",
        coordinates: [
          [13, 51],
          [13.1, 51],
          [13.1, 51.1],
        ],
      },
    });
  });
});

const tactilePavingFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.1 },
    { type: "node", id: 3, lat: 51.1, lon: 13.1 },
    { type: "way", id: 10, nodes: [1, 2, 3], tags: { tactile_paving: "yes", level: "0" } },
    { type: "way", id: 11, nodes: [1, 2], tags: { tactile_paving: "no", level: "0" } },
  ],
};

import { IndoorPointFeature, OsmGraph, OverpassJson } from "../../src/indoor";

describe("IndoorPointFeature", () => {
  it("collects marker-relevant point features from the graph", () => {
    const graph = new OsmGraph(pointFeatureFixture);

    expect(
      IndoorPointFeature.collectFromGraph(graph).map((pointFeature) => pointFeature.id),
    ).toEqual(["node/10"]);
  });

  it("creates point geometry from a point node", () => {
    const graph = new OsmGraph(pointFeatureFixture);
    const pointFeature = IndoorPointFeature.collectFromGraph(graph)[0];

    expect(pointFeature.id).toBe("node/10");
    expect(pointFeature.tags).toEqual({ amenity: "toilets", level: "0" });
    expect(pointFeature.geometry).toEqual({
      type: "Point",
      coordinates: [13, 51],
    });
  });
});

const pointFeatureFixture: OverpassJson = {
  elements: [
    { type: "node", id: 10, lat: 51, lon: 13, tags: { amenity: "toilets", level: "0" } },
    { type: "node", id: 11, lat: 51, lon: 13.1, tags: { name: "Plain node", level: "0" } },
    {
      type: "node",
      id: 12,
      lat: 51,
      lon: 13.2,
      tags: { information: "tactile_map", level: "0" },
    },
  ],
};

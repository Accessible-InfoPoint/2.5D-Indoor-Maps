import { IndoorPointFeature } from "../../src/indoor/elements/IndoorPointFeature";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorPointFeature", () => {
  it("collects marker-relevant point features from the graph", () => {
    const graph = new OsmGraph(pointFeatureFixture);

    expect(
      IndoorPointFeature.collectFromGraph(graph).map((pointFeature) => pointFeature.id),
    ).toEqual(["node/10"]);
  });

  it("creates a point feature from a point node", () => {
    const graph = new OsmGraph(pointFeatureFixture);
    const pointFeature = IndoorPointFeature.collectFromGraph(graph)[0];

    expect(pointFeature.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "node/10",
      properties: { amenity: "toilets", level: "0" },
      geometry: {
        type: "Point",
        coordinates: [13, 51],
      },
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

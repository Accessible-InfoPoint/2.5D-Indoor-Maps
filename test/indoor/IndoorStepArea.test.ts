import { IndoorStepArea } from "../../src/indoor/elements/IndoorStepArea";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorStepArea", () => {
  it("collects area:highway=steps ways from the raw graph", () => {
    const graph = new OsmGraph(stepAreaFixture);

    const stepAreas = IndoorStepArea.collectFromGraph(graph);

    expect(stepAreas.map((stepArea) => stepArea.id)).toEqual(["way/10"]);
    expect(stepAreas[0].levels).toEqual([0, 1]);
    expect(stepAreas[0].nodeIds).toEqual([1, 2, 3, 1]);
  });

  it("returns area geometry for width sampling without producing GeoJSON features", () => {
    const graph = new OsmGraph(stepAreaFixture);
    const stepArea = IndoorStepArea.collectFromGraph(graph)[0];

    expect(stepArea.toAreaGeometry()).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [13, 51],
          [13.2, 51],
          [13.2, 51.2],
          [13, 51],
        ],
      ],
    });
    expect(stepArea.toGeoJsonFeature()).toBeUndefined();
  });
});

const stepAreaFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.2 },
    { type: "node", id: 3, lat: 51.2, lon: 13.2 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { "area:highway": "steps", level: "0;1" },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "area", level: "0" },
    },
  ],
};

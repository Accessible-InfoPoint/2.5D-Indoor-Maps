import { IndoorLevelOutline } from "../../src/indoor/elements/IndoorLevelOutline";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorLevelOutline", () => {
  it("collects indoor=level ways and exposes level:ref labels", () => {
    const graph = new OsmGraph(levelOutlineFixture);

    const outlines = IndoorLevelOutline.collectFromGraph(graph);

    expect(outlines.map((outline) => outline.id)).toEqual(["way/10"]);
    expect(outlines[0].levels).toEqual([0]);
    expect(outlines[0].label).toBe("E");
  });

  it("returns the full outline geometry for rendering", () => {
    const graph = new OsmGraph(levelOutlineFixture);
    const outline = IndoorLevelOutline.collectFromGraph(graph)[0];

    expect(outline.geometry).toEqual({
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
  });
});

const levelOutlineFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.2 },
    { type: "node", id: 3, lat: 51.2, lon: 13.2 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "level", level: "0", "level:ref": "E" },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "0" },
    },
  ],
};

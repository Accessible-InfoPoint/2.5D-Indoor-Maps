import { IndoorColumn, OsmGraph, OverpassJson } from "../../src/indoor";

describe("IndoorColumn", () => {
  it("collects node, way, and relation columns", () => {
    const graph = new OsmGraph(columnFixture);

    expect(IndoorColumn.collectFromGraph(graph).map((column) => column.id)).toEqual([
      "node/1",
      "way/10",
      "relation/20",
    ]);
  });

  it("approximates a node column as a closed polygon", () => {
    const graph = new OsmGraph(columnFixture);
    const column = new IndoorColumn(graph, graph.getNode(1)!);

    expect(column.id).toBe("node/1");
    expect(column.tags).toEqual({ indoor: "column", level: "0", diameter: "1" });
    expect(column.geometry?.type).toBe("Polygon");

    const ring = (column.geometry as GeoJSON.Polygon).coordinates[0];

    expect(ring).toHaveLength(25);
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ring[0][0]).toBeGreaterThan(13);
    expect(ring[0][1]).toBeCloseTo(51);
  });

  it("uses authored way and relation geometry when available", () => {
    const graph = new OsmGraph(columnFixture);
    const wayColumn = new IndoorColumn(graph, graph.getWay(10)!);
    const relationColumn = new IndoorColumn(graph, graph.getRelation(20)!);

    expect(wayColumn.geometry).toEqual({
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
    expect(relationColumn.geometry?.type).toBe("Polygon");
  });
});

const columnFixture: OverpassJson = {
  elements: [
    {
      type: "node",
      id: 1,
      lat: 51,
      lon: 13,
      tags: { indoor: "column", level: "0", diameter: "1" },
    },
    { type: "node", id: 2, lat: 51, lon: 13 },
    { type: "node", id: 3, lat: 51, lon: 13.1 },
    { type: "node", id: 4, lat: 51.1, lon: 13.1 },
    { type: "node", id: 5, lat: 51.1, lon: 13 },
    {
      type: "way",
      id: 10,
      nodes: [2, 3, 4, 2],
      tags: { indoor: "column", level: "0" },
    },
    {
      type: "way",
      id: 11,
      nodes: [2, 3, 4, 5, 2],
    },
    {
      type: "relation",
      id: 20,
      members: [{ type: "way", ref: 11, role: "outer" }],
      tags: { indoor: "column", type: "multipolygon", level: "0" },
    },
  ],
};

import { IndoorRoom } from "../../src/indoor/elements/IndoorRoom";
import { OverpassJson } from "../../src/models/overpassJson";
import { OsmGraph } from "../../src/overpass/OsmGraph";

describe("IndoorRoom", () => {
  it("collects raw room, corridor, and area elements as rooms", () => {
    const graph = new OsmGraph(roomFixture);

    expect(IndoorRoom.collectFromGraph(graph).map((room) => room.id)).toEqual([
      "way/10",
      "way/11",
      "way/12",
      "relation/100",
    ]);
  });

  it("creates a polygon feature from a room way", () => {
    const graph = new OsmGraph(roomFixture);
    const room = new IndoorRoom(graph, graph.getWay(10)!);

    expect(room.toGeoJsonFeature()).toEqual({
      type: "Feature",
      id: "way/10",
      properties: {
        indoor: "room",
        level: "0",
        name: "Room A",
      },
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

  it("closes open way rings for rendering", () => {
    const graph = new OsmGraph(roomFixture);
    const room = new IndoorRoom(graph, graph.getWay(11)!);

    expect(room.toGeoJsonFeature()?.geometry.coordinates[0]).toEqual([
      [13, 51],
      [13.1, 51],
      [13.1, 51.1],
      [13, 51],
    ]);
  });

  it("exposes combined level and repeat_on values", () => {
    const graph = new OsmGraph(roomFixture);
    const room = new IndoorRoom(graph, graph.getWay(12)!);

    expect(room.levels).toEqual([1, 2]);
    expect(room.hasLevel(1)).toBe(true);
    expect(room.hasLevel(2)).toBe(true);
    expect(room.hasLevel(0)).toBe(false);
  });

  it("leaves relation geometry for a later parser", () => {
    const graph = new OsmGraph(roomFixture);
    const room = new IndoorRoom(graph, graph.getRelation(100)!);

    expect(room.toGeoJsonFeature()).toBeUndefined();
  });
});

const roomFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 51, lon: 13 },
    { type: "node", id: 2, lat: 51, lon: 13.1 },
    { type: "node", id: 3, lat: 51.1, lon: 13.1 },
    {
      type: "way",
      id: 10,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "room", level: "0", name: "Room A" },
    },
    {
      type: "way",
      id: 11,
      nodes: [1, 2, 3],
      tags: { indoor: "corridor", level: "0" },
    },
    {
      type: "way",
      id: 12,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "area", level: "1", repeat_on: "2" },
    },
    {
      type: "way",
      id: 13,
      nodes: [1, 2, 3, 1],
      tags: { indoor: "area", level: "0", landing: "yes" },
    },
    {
      type: "node",
      id: 20,
      lat: 51,
      lon: 13,
      tags: { indoor: "room", level: "99" },
    },
    {
      type: "relation",
      id: 100,
      members: [{ type: "way", ref: 10, role: "outer" }],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
  ],
};

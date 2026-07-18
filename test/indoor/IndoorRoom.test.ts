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

  it("creates a polygon feature from a one-outer relation", () => {
    const graph = new OsmGraph(roomFixture);
    const room = new IndoorRoom(graph, graph.getRelation(100)!);

    expect(room.toGeoJsonFeature()?.geometry).toEqual({
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
  });

  it("assigns multiple inner rings as holes in the containing outer ring", () => {
    const graph = new OsmGraph(relationFixture);
    const room = new IndoorRoom(graph, graph.getRelation(200)!);

    expect(room.toGeoJsonFeature()?.geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [1, 1],
          [2, 1],
          [2, 2],
          [1, 2],
          [1, 1],
        ],
        [
          [7, 7],
          [8, 7],
          [8, 8],
          [7, 8],
          [7, 7],
        ],
      ],
    });
  });

  it("joins multiple outer member ways into rings", () => {
    const graph = new OsmGraph(relationFixture);
    const room = new IndoorRoom(graph, graph.getRelation(201)!);

    expect(room.toGeoJsonFeature()?.geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
          [10, 0],
        ],
      ],
    });
  });

  it("creates a multipolygon for multiple outer rings", () => {
    const graph = new OsmGraph(relationFixture);
    const room = new IndoorRoom(graph, graph.getRelation(202)!);

    expect(room.toGeoJsonFeature()?.geometry).toEqual({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ],
        [
          [
            [20, 20],
            [21, 20],
            [21, 21],
            [20, 20],
          ],
        ],
      ],
    });
  });

  it("warns once when a room way cannot be rendered because nodes are missing", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const graph = new OsmGraph(unsupportedFixture);
    const room = new IndoorRoom(graph, graph.getWay(300)!);

    expect(room.toGeoJsonFeature()).toBeUndefined();
    expect(room.toGeoJsonFeature()).toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "[IndoorRoom] Cannot render room way/300: missing node(s) 999.",
    );

    warnSpy.mockRestore();
  });

  it("warns when a relation has unsupported member roles or incomplete outer rings", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const graph = new OsmGraph(unsupportedFixture);
    const room = new IndoorRoom(graph, graph.getRelation(301)!);

    expect(room.toGeoJsonFeature()).toBeUndefined();

    expect(warnSpy.mock.calls.map(([message]) => message)).toEqual([
      "[IndoorRoom] Ignoring 1 way member(s) in room relation relation/301: only outer and inner roles are supported.",
      "[IndoorRoom] Ignoring incomplete outer ring in room relation relation/301: way chain way/301 does not close.",
      "[IndoorRoom] Cannot render room relation relation/301: no complete outer ring was found.",
    ]);

    warnSpy.mockRestore();
  });

  it("warns when relation inner rings cannot be assigned to an outer ring", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const graph = new OsmGraph(unsupportedFixture);
    const room = new IndoorRoom(graph, graph.getRelation(302)!);

    expect(room.toGeoJsonFeature()?.geometry.type).toBe("Polygon");

    expect(warnSpy).toHaveBeenCalledWith(
      "[IndoorRoom] Ignoring inner ring in room relation relation/302: it is not contained by any outer ring.",
    );

    warnSpy.mockRestore();
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

const relationFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 10 },
    { type: "node", id: 3, lat: 10, lon: 10 },
    { type: "node", id: 4, lat: 10, lon: 0 },
    { type: "node", id: 5, lat: 1, lon: 1 },
    { type: "node", id: 6, lat: 1, lon: 2 },
    { type: "node", id: 7, lat: 2, lon: 2 },
    { type: "node", id: 8, lat: 2, lon: 1 },
    { type: "node", id: 9, lat: 7, lon: 7 },
    { type: "node", id: 10, lat: 7, lon: 8 },
    { type: "node", id: 11, lat: 8, lon: 8 },
    { type: "node", id: 12, lat: 8, lon: 7 },
    { type: "node", id: 13, lat: 20, lon: 20 },
    { type: "node", id: 14, lat: 20, lon: 21 },
    { type: "node", id: 15, lat: 21, lon: 21 },
    { type: "way", id: 100, nodes: [1, 2, 3, 4, 1] },
    { type: "way", id: 101, nodes: [5, 6, 7, 8, 5] },
    { type: "way", id: 102, nodes: [9, 10, 11, 12, 9] },
    { type: "way", id: 103, nodes: [1, 2] },
    { type: "way", id: 104, nodes: [2, 3] },
    { type: "way", id: 105, nodes: [3, 4, 1] },
    { type: "way", id: 106, nodes: [13, 14, 15, 13] },
    {
      type: "relation",
      id: 200,
      members: [
        { type: "way", ref: 100, role: "outer" },
        { type: "way", ref: 101, role: "inner" },
        { type: "way", ref: 102, role: "inner" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
    {
      type: "relation",
      id: 201,
      members: [
        { type: "way", ref: 104, role: "outer" },
        { type: "way", ref: 105, role: "outer" },
        { type: "way", ref: 103, role: "outer" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
    {
      type: "relation",
      id: 202,
      members: [
        { type: "way", ref: 100, role: "outer" },
        { type: "way", ref: 106, role: "outer" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
  ],
};

const unsupportedFixture: OverpassJson = {
  elements: [
    { type: "node", id: 1, lat: 0, lon: 0 },
    { type: "node", id: 2, lat: 0, lon: 10 },
    { type: "node", id: 3, lat: 10, lon: 10 },
    { type: "node", id: 4, lat: 10, lon: 0 },
    { type: "node", id: 5, lat: 20, lon: 20 },
    { type: "node", id: 6, lat: 20, lon: 21 },
    { type: "node", id: 7, lat: 21, lon: 21 },
    {
      type: "way",
      id: 300,
      nodes: [1, 999, 1],
      tags: { indoor: "room", level: "0" },
    },
    {
      type: "way",
      id: 301,
      nodes: [1, 2],
    },
    {
      type: "way",
      id: 302,
      nodes: [1, 2, 3, 4, 1],
    },
    {
      type: "way",
      id: 303,
      nodes: [5, 6, 7, 5],
    },
    {
      type: "relation",
      id: 301,
      members: [
        { type: "way", ref: 301, role: "outer" },
        { type: "way", ref: 302, role: "" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
    {
      type: "relation",
      id: 302,
      members: [
        { type: "way", ref: 302, role: "outer" },
        { type: "way", ref: 303, role: "inner" },
      ],
      tags: { type: "multipolygon", indoor: "room", level: "0" },
    },
  ],
};
